import os
from vncdotool import api
import time
from typing import Optional
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
import base64
from PIL import Image
import shutil
import asyncio
import logging

KEYBOARD_KEYS = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'enter', 'esc', 'backspace', 'tab', 'space', 'delete',
    'ctrl', 'alt', 'shift', 'win',
    'up', 'down', 'left', 'right',
    'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
    'ctrl+c', 'ctrl+v', 'ctrl+x', 'ctrl+z', 'ctrl+a', 'ctrl+s',
    'alt+tab', 'alt+f4', 'ctrl+alt+delete'
]

class ComputerUseTool(Tool):
    """VNC control tool for remote desktop automation."""
    
    def __init__(self, host: str = 'sandbox-ip-go-here', port: int = 5900, 
                 password: str = 'admin'):
        """Initialize VNC tool basic attributes."""
        super().__init__()
        self._loop = None  # Store reference to event loop
        self.host = host
        self.port = port
        self.password = password
        self.client = None
        self.mouse_x = 0  # Track current mouse position
        self.mouse_y = 0
        
    @classmethod
    async def create(cls, host: str = 'sandbox-ip-go-here', port: int = 5900, 
                    password: str = 'admin'):
        """Create and initialize a VNC tool instance."""
        instance = cls(host, port, password)
        await instance._connect()
        return instance

    def _get_event_loop(self) -> asyncio.AbstractEventLoop:
        """Get or create event loop safely."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        self._loop = loop
        return loop

    async def _cleanup(self):
        """Clean up resources properly."""
        # First cleanup VNC client
        if self.client:
            try:
                self.client.disconnect()
                print("Disconnected from VNC server")
            except:
                pass
            self.client = None
        
        # Add a small delay to ensure pending operations complete
        await asyncio.sleep(0.1)

    def __del__(self):
        """Cleanup by disconnecting from VNC server."""
        if self._loop and not self._loop.is_closed():
            try:
                # Create a new event loop if needed
                if asyncio.get_event_loop().is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                # Run cleanup
                asyncio.get_event_loop().run_until_complete(self._cleanup())
            except:
                pass  # Suppress errors during cleanup

    async def _connect(self) -> None:
        """Establish VNC connection with retries."""
        max_retries = 3
        retry_delay = 1  # Reduced from 2 to 1 second
        
        for attempt in range(max_retries):
            try:
                connection_string = f'{self.host}::{self.port}'
                print(f"Connecting to VNC server at {connection_string} (attempt {attempt + 1}/{max_retries})...")
                
                self.client = api.connect(connection_string, password=self.password)
                await asyncio.sleep(1)  # Reduced from 2 to 1 second
                
                screen_width = 1024
                screen_height = 768
                self.mouse_x = screen_width // 2
                self.mouse_y = screen_height // 2
                
                # Take initial screenshot to verify connection
                await self.get_screenshot_base64()
                await asyncio.sleep(0.5)  # Reduced from 1 to 0.5 seconds
                
                print(f"Successfully connected to VNC server at {self.host}")
                return
                
            except Exception as e:
                print(f"Connection attempt {attempt + 1} failed: {str(e)}")
                if self.client:
                    try:
                        self.client.disconnect()
                    except:
                        pass
                    self.client = None
                    
                if attempt < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    print("Max retries reached. Could not establish connection.")
                    raise Exception(f"Failed to connect to VNC server: {str(e)}")

    async def _ensure_connection(self) -> bool:
        """Ensure VNC connection is active, reconnect if needed."""
        if self.client is None:
            await self._connect()
            return self.client is not None

        try:
            return True
        except:
            print("Connection test failed, attempting to reconnect...")
            self.client = None
            return await self._ensure_connection()

    def _get_current_position(self) -> tuple[int, int]:
        """Get current mouse position from VNC client."""
        try:
            # Get position from client's internal state
            return (self.client.x, self.client.y)
        except:
            # Fallback to tracked position if client doesn't expose position
            return (self.mouse_x, self.mouse_y)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "move_to",
            "description": "Move cursor to specified position",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {
                        "type": "number",
                        "description": "X coordinate"
                    },
                    "y": {
                        "type": "number",
                        "description": "Y coordinate"
                    }
                },
                "required": ["x", "y"]
            }
        }
    })
    @xml_schema(
        tag_name="move-to",
        mappings=[
            {"param_name": "x", "node_type": "attribute", "path": "."},
            {"param_name": "y", "node_type": "attribute", "path": "."}
        ],
        example='''
        <move-to x="100" y="200">
        </move-to>
        '''
    )
    async def move_to(self, x: float, y: float) -> ToolResult:
        """Move cursor to specified position."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")
            
            x_int = int(round(float(x)))
            y_int = int(round(float(y)))
            
            self.client.mouseMove(x_int, y_int)
            await asyncio.sleep(0.1)  # Reduced from 0.2 to 0.1 seconds
            
            self.mouse_x = x_int
            self.mouse_y = y_int
            
            return ToolResult(success=True, output=f"Moved to ({x_int}, {y_int})")
                
        except Exception as e:
            return ToolResult(success=False, output=f"Failed to move: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "click",
            "description": "Click at current or specified position",
            "parameters": {
                "type": "object",
                "properties": {
                    "button": {
                        "type": "string",
                        "description": "Mouse button to click",
                        "enum": ["left", "right", "middle"],
                        "default": "left"
                    },
                    "x": {
                        "type": "number",
                        "description": "Optional X coordinate"
                    },
                    "y": {
                        "type": "number",
                        "description": "Optional Y coordinate"
                    },
                    "num_clicks": {
                        "type": "integer",
                        "description": "Number of clicks",
                        "enum": [1, 2, 3],
                        "default": 1
                    }
                }
            }
        }
    })
    @xml_schema(
        tag_name="click",
        mappings=[
            {"param_name": "x", "node_type": "attribute", "path": "x"},
            {"param_name": "y", "node_type": "attribute", "path": "y"},
            {"param_name": "button", "node_type": "attribute", "path": "button"},
            {"param_name": "num_clicks", "node_type": "attribute", "path": "num_clicks"}
        ],
        example='''
        <click x="100" y="200" button="left" num_clicks="1">
        </click>
        '''
    )
    async def click(self, x: Optional[float] = None, y: Optional[float] = None, 
                   button: str = "left", num_clicks: int = 1) -> ToolResult:
        """Click at current or specified position."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")

            if x is not None or y is not None:
                x_val = x if x is not None else self.mouse_x
                y_val = y if y is not None else self.mouse_y
                
                x_int = int(round(float(x_val)))
                y_int = int(round(float(y_val)))
                
                move_result = await self.move_to(x_int, y_int)
                if not move_result.success:
                    return move_result

            button_map = {"left": 1, "right": 3, "middle": 2}
            button_num = button_map.get(button.lower(), 1)
            num_clicks = int(num_clicks)

            for click_num in range(num_clicks):
                self.client.mouseMove(self.mouse_x, self.mouse_y)
                await asyncio.sleep(0.05)  # Reduced from 0.1 to 0.05 seconds
                
                self.client.mouseDown(button_num)
                await asyncio.sleep(0.05)  # Reduced from 0.1 to 0.05 seconds
                self.client.mouseUp(button_num)
                
                if click_num < num_clicks - 1:
                    await asyncio.sleep(0.1)  # Reduced from 0.2 to 0.1 seconds

            return ToolResult(success=True, 
                            output=f"{num_clicks} {button} click(s) performed at ({self.mouse_x}, {self.mouse_y})")
        except Exception as e:
            return ToolResult(success=False, output=f"Failed to click: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "scroll",
            "description": "Scroll the mouse wheel at current position",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "integer",
                        "description": "Scroll amount (positive for up, negative for down)",
                        "minimum": -10,
                        "maximum": 10
                    }
                },
                "required": ["amount"]
            }
        }
    })
    @xml_schema(
        tag_name="scroll",
        mappings=[
            {"param_name": "amount", "node_type": "attribute", "path": "amount"}
        ],
        example='''
        <scroll amount="-3">
        </scroll>
        '''
    )
    async def scroll(self, amount: int) -> ToolResult:
        """
        Scroll the mouse wheel at current position.
        Positive values scroll up, negative values scroll down.
        """
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")

            # Convert and validate amount
            try:
                amount = int(float(amount))  # Handle both string and float inputs
                amount = max(-10, min(10, amount))  # Clamp between -10 and 10
                logging.info(f"Scrolling with amount: {amount}")
            except (ValueError, TypeError) as e:
                logging.error(f"Invalid scroll amount: {amount}")
                return ToolResult(success=False, output=f"Invalid scroll amount: {str(e)}")

            # Use tracked mouse position
            x, y = self.mouse_x, self.mouse_y
            
            # Ensure we're at the right position
            self.client.mouseMove(x, y)
            await asyncio.sleep(0.2)  # Wait for move to complete
            
            # Determine scroll direction and steps
            steps = abs(amount)
            button = 4 if amount > 0 else 5  # 4 = up, 5 = down
            
            # Perform scroll actions with longer delays
            for _ in range(steps):
                # Verify position before each scroll
                self.client.mouseMove(x, y)
                await asyncio.sleep(0.1)
                
                # Send wheel event with longer press duration
                self.client.mouseDown(button)
                await asyncio.sleep(0.1)  # Hold button longer
                self.client.mouseUp(button)
                await asyncio.sleep(0.2)  # Wait between scrolls

            direction = "up" if amount > 0 else "down"
            return ToolResult(success=True, 
                            output=f"Scrolled {direction} {steps} step(s) at position ({x}, {y})")
        except Exception as e:
            logging.error(f"Scroll failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to scroll: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "typing",
            "description": "Type specified text",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to type"
                    }
                },
                "required": ["text"]
            }
        }
    })
    @xml_schema(
        tag_name="typing",
        mappings=[
            {"param_name": "text", "node_type": "content", "path": "text"}
        ],
        example='''
        <typing>Hello World!</typing>
        '''
    )
    async def typing(self, text: str) -> ToolResult:
        """Type specified text."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")
            
            text = str(text)
            
            char_mapping = {
                '!': ['shift', '1'],
                '@': ['shift', '2'],
                '#': ['shift', '3'],
                '$': ['shift', '4'],
                '%': ['shift', '5'],
                '^': ['shift', '6'],
                '&': ['shift', '7'],
                '*': ['shift', '8'],
                '(': ['shift', '9'],
                ')': ['shift', '0'],
                '_': ['shift', '-'],
                '+': ['shift', '='],
                '?': ['shift', '/'],
                '"': ['shift', "'"],
                '<': ['shift', ','],
                '>': ['shift', '.'],
                '{': ['shift', '['],
                '}': ['shift', ']'],
                '|': ['shift', '\\'],
                '~': ['shift', '`'],
                ':': ['shift', ';'],
            }
            
            for char in text:
                if char in char_mapping:
                    self.client.keyDown('shift')
                    await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
                    self.client.keyPress(char_mapping[char][1])
                    await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
                    self.client.keyUp('shift')
                elif char.isupper():
                    self.client.keyDown('shift')
                    await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
                    self.client.keyPress(char.lower())
                    await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
                    self.client.keyUp('shift')
                else:
                    self.client.keyPress(char)
                    await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
                
            return ToolResult(success=True, output=f"Typed: {text}")
        except Exception as e:
            return ToolResult(success=False, output=f"Failed to type: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "press",
            "description": "Press and release a key",
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "Key to press",
                        "enum": KEYBOARD_KEYS
                    }
                },
                "required": ["key"]
            }
        }
    })
    @xml_schema(
        tag_name="press",
        mappings=[
            {"param_name": "key", "node_type": "attribute", "path": "key"}
        ],
        example='''
        <press key="enter">
        </press>
        '''
    )
    async def press(self, key: str) -> ToolResult:
        """Press and release a key."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")
            
            key = str(key).lower()  # Normalize key name
            if key not in KEYBOARD_KEYS:
                logging.error(f"Invalid key: {key}")
                return ToolResult(success=False, output=f"Invalid key: {key}")
                
            logging.info(f"Pressing key: {key}")
            self.client.keyPress(key)
            return ToolResult(success=True, output=f"Pressed key: {key}")
        except Exception as e:
            logging.error(f"Key press failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to press key: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "wait",
            "description": "Wait for specified duration",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration": {
                        "type": "number",
                        "description": "Duration in seconds",
                        "default": 0.5
                    }
                }
            }
        }
    })
    @xml_schema(
        tag_name="wait",
        mappings=[
            {"param_name": "duration", "node_type": "attribute", "path": "duration"}
        ],
        example='''
        <wait duration="1.5">
        </wait>
        '''
    )
    async def wait(self, duration: float = 0.5) -> ToolResult:
        """Wait for specified duration."""
        try:
            # Convert and validate duration
            try:
                duration = float(duration)
                duration = max(0, min(10, duration))  # Clamp between 0 and 10 seconds
                logging.info(f"Waiting for {duration} seconds")
            except (ValueError, TypeError) as e:
                logging.error(f"Invalid duration: {duration}")
                return ToolResult(success=False, output=f"Invalid duration: {str(e)}")
            
            await asyncio.sleep(duration)
            return ToolResult(success=True, output=f"Waited {duration} seconds")
        except Exception as e:
            logging.error(f"Wait failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to wait: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "mouse_down",
            "description": "Press a mouse button",
            "parameters": {
                "type": "object",
                "properties": {
                    "button": {
                        "type": "string",
                        "description": "Mouse button to press",
                        "enum": ["left", "right", "middle"],
                        "default": "left"
                    }
                }
            }
        }
    })
    @xml_schema(
        tag_name="mouse-down",
        mappings=[
            {"param_name": "button", "node_type": "attribute", "path": "button"}
        ],
        example='''
        <mouse-down button="left">
        </mouse-down>
        '''
    )
    async def mouse_down(self, button: str = "left", x: Optional[float] = None, y: Optional[float] = None) -> ToolResult:
        """Press a mouse button at current or specified position."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")
            
            # If coordinates are provided, move there first
            if x is not None and y is not None:
                try:
                    x_int = int(round(float(x)))  # Convert to float first, then round and convert to int
                    y_int = int(round(float(y)))  # Convert to float first, then round and convert to int
                    logging.debug(f"Moving to press position: ({x_int}, {y_int})")
                    print(f"[Debug] Moving to press position: ({x_int}, {y_int})")
                    move_result = await self.move_to(x_int, y_int)
                    if not move_result.success:
                        return move_result
                except (ValueError, TypeError) as e:
                    logging.error(f"Invalid coordinates: x={x}, y={y}")
                    return ToolResult(success=False, output=f"Invalid coordinates: {str(e)}")
            
            button = str(button).lower()  # Normalize button name
            button_map = {"left": 1, "right": 3, "middle": 2}
            
            if button not in button_map:
                return ToolResult(success=False, output=f"Invalid button: {button}")
            
            self.client.mouseDown(button_map[button])
            return ToolResult(success=True, output=f"{button} button pressed at ({self.mouse_x}, {self.mouse_y})")
            
        except Exception as e:
            logging.error(f"Mouse down failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to press button: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "mouse_up",
            "description": "Release a mouse button",
            "parameters": {
                "type": "object",
                "properties": {
                    "button": {
                        "type": "string",
                        "description": "Mouse button to release",
                        "enum": ["left", "right", "middle"],
                        "default": "left"
                    }
                }
            }
        }
    })
    @xml_schema(
        tag_name="mouse-up",
        mappings=[
            {"param_name": "button", "node_type": "attribute", "path": "button"}
        ],
        example='''
        <mouse-up button="left">
        </mouse-up>
        '''
    )
    async def mouse_up(self, button: str = "left", x: Optional[float] = None, y: Optional[float] = None) -> ToolResult:
        """Release a mouse button at current or specified position."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")
            
            # If coordinates are provided, move there first
            if x is not None and y is not None:
                try:
                    x_int = int(round(float(x)))  # Convert to float first, then round and convert to int
                    y_int = int(round(float(y)))  # Convert to float first, then round and convert to int
                    logging.debug(f"Moving to release position: ({x_int}, {y_int})")
                    move_result = await self.move_to(x_int, y_int)
                    if not move_result.success:
                        return move_result
                except (ValueError, TypeError) as e:
                    logging.error(f"Invalid coordinates: x={x}, y={y}")
                    return ToolResult(success=False, output=f"Invalid coordinates: {str(e)}")
            
            button = str(button).lower()  # Normalize button name
            button_map = {"left": 1, "right": 3, "middle": 2}
            
            if button not in button_map:
                return ToolResult(success=False, output=f"Invalid button: {button}")
            
            self.client.mouseUp(button_map[button])
            return ToolResult(success=True, output=f"{button} button released at ({self.mouse_x}, {self.mouse_y})")
            
        except Exception as e:
            logging.error(f"Mouse up failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to release button: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "drag_to",
            "description": "Drag cursor to specified position",
            "parameters": {
                "type": "object",
                "properties": {
                    "x": {
                        "type": "number",
                        "description": "Target X coordinate"
                    },
                    "y": {
                        "type": "number",
                        "description": "Target Y coordinate"
                    }
                },
                "required": ["x", "y"]
            }
        }
    })
    @xml_schema(
        tag_name="drag-to",
        mappings=[
            {"param_name": "x", "node_type": "attribute", "path": "x"},
            {"param_name": "y", "node_type": "attribute", "path": "y"}
        ],
        example='''
        <drag-to x="500" y="50">
        </drag-to>
        '''
    )
    async def drag_to(self, x: float, y: float) -> ToolResult:
        """Click and drag from current position to target position."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")

            target_x = int(round(float(x)))
            target_y = int(round(float(y)))
            start_x = int(round(float(self.mouse_x)))
            start_y = int(round(float(self.mouse_y)))
            
            steps = 20  # Reduced from 40 to 20 steps for faster movement
            for i in range(1, steps + 1):
                current_x = int(round(start_x + ((target_x - start_x) * i / steps)))
                current_y = int(round(start_y + ((target_y - start_y) * i / steps)))
                
                self.client.mouseMove(current_x, current_y)
                self.mouse_x = current_x
                self.mouse_y = current_y
                await asyncio.sleep(0.02)  # Reduced from 0.05 to 0.02 seconds
            
            self.client.mouseMove(target_x, target_y)
            self.mouse_x = target_x
            self.mouse_y = target_y
            await asyncio.sleep(0.2)  # Reduced from 0.5 to 0.2 seconds

            return ToolResult(success=True, 
                            output=f"Dragged from ({start_x}, {start_y}) to ({target_x}, {target_y})")
                
        except Exception as e:
            return ToolResult(success=False, output=f"Failed to drag: {str(e)}")

    async def get_screen_size(self) -> tuple[int, int]:
        """Get the VNC screen dimensions."""
        try:
            if not await self._ensure_connection():
                return (0, 0)
            
            # Capture temporary screenshot to get dimensions
            temp_filename = "temp_screenshot.png"
            try:
                self.client.captureScreen(temp_filename)
                with Image.open(temp_filename) as img:
                    width, height = img.size
                    return (width, height)
            finally:
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
                    
        except Exception as e:
            print(f"Failed to get screen size: {str(e)}")
            return (0, 0)

    async def get_screenshot_base64(self) -> Optional[dict]:
        """Capture screen and return as base64 encoded image."""
        try:
            if not await self._ensure_connection():
                return None
            
            screenshots_dir = "screenshots"
            if not os.path.exists(screenshots_dir):
                os.makedirs(screenshots_dir)
            
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            temp_filename = os.path.join(screenshots_dir, f"temp_{timestamp}.png")
            latest_filename = "latest_screenshot.png"
            timestamped_filename = os.path.join(screenshots_dir, f"screenshot_{timestamp}.png")
            
            try:
                await asyncio.sleep(1)  # Reduced from 3 to 1 second
                
                self.client.captureScreen(temp_filename)
                
                timeout = 3  # Reduced from 5 to 3 seconds
                start_wait_time = time.time()
                while not os.path.exists(temp_filename) or os.path.getsize(temp_filename) == 0:
                    if time.time() - start_wait_time > timeout:
                        raise Exception("Screenshot capture timeout")
                    await asyncio.sleep(0.05)  # Reduced from 0.1 to 0.05 seconds
                
                shutil.copy2(temp_filename, latest_filename)
                shutil.copy2(temp_filename, timestamped_filename)
                
                with open(temp_filename, 'rb') as img_file:
                    img_data = img_file.read()
                    if len(img_data) == 0:
                        raise Exception("Empty screenshot file")
                        
                    base64_str = base64.b64encode(img_data).decode('utf-8')
                    return {
                        "content_type": "image/png",
                        "base64": base64_str,
                        "timestamp": timestamp,
                        "filename": timestamped_filename
                    }
                    
            finally:
                if os.path.exists(temp_filename):
                    try:
                        os.remove(temp_filename)
                    except:
                        pass
                    
        except Exception as e:
            print(f"[Screenshot] Error during screenshot process: {str(e)}")
            return None

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "hotkey",
            "description": "Press a key combination",
            "parameters": {
                "type": "object",
                "properties": {
                    "keys": {
                        "type": "string",
                        "description": "Key combination to press",
                        "enum": KEYBOARD_KEYS
                    }
                },
                "required": ["keys"]
            }
        }
    })
    @xml_schema(
        tag_name="hotkey",
        mappings=[
            {"param_name": "keys", "node_type": "attribute", "path": "keys"}
        ],
        example='''
        <hotkey keys="ctrl+a">
        </hotkey>
        '''
        )    
    async def hotkey(self, keys: str) -> ToolResult:
        """Press a key combination."""
        try:
            if not await self._ensure_connection():
                return ToolResult(success=False, output="Failed to establish VNC connection")

            keys = str(keys).lower().strip()
            key_sequence = keys.split('+')
            
            for key in key_sequence[:-1]:
                self.client.keyDown(key)
                await asyncio.sleep(0.02)  # Reduced from 0.1 to 0.02 seconds

            self.client.keyPress(key_sequence[-1])
            await asyncio.sleep(0.02)  # Reduced from 0.1 to 0.02 seconds

            for key in reversed(key_sequence[:-1]):
                self.client.keyUp(key)
                await asyncio.sleep(0.02)  # Reduced from 0.1 to 0.02 seconds

            return ToolResult(success=True, output=f"Pressed key combination: {keys}")

        except Exception as e:
            logging.error(f"Hotkey failed: {str(e)}")
            return ToolResult(success=False, output=f"Failed to press keys: {str(e)}")

if __name__ == "__main__":
    import asyncio
    
    async def test_vnc_tool():
        vnc = None
        try:
            # Initialize the VNC tool with connection details
            print("Initializing VNC Tool...")
            # vnc = await ComputerUseTool.create(host='172.202.112.205', password='admin')
            vnc = await ComputerUseTool.create(host='192.168.1.5', password='admin', port=3859)

            # Test Ctrl+Alt+Delete
            # print("\nTesting Ctrl+Alt+Delete...")
            # await vnc.hotkey("ctrl+alt+delete")
            # await vnc.wait(2)  # Give some time to observe the effect
            # print("\nCtrl+Alt+Delete test completed!")

            # print("\nTesting Ctrl+A...")
            # await vnc.hotkey("ctrl+a")
            # await vnc.wait(2)  # Give some time to observe the effect
            # await vnc.hotkey("left")
            # print("\nCtrl+A test completed!")

            # screenshot = await vnc.get_screenshot_base64()
            #
            # # Test clicking and dragging the Rumble logo to URL bar
            # print("\nTesting click and drag of Rumble logo...")
            # 
            # # Move to Rumble logo position
            # await vnc.move_to(160, 100)
            # await vnc.wait(0.5)
            # 
            # # Click and hold the logo
            # await vnc.mouse_down(button="left") 
            # await vnc.wait(0.5)
            # 
            # # Drag to URL bar position
            # await vnc.drag_to(200, 50)
            # await vnc.wait(0.5)
            # 
            # # Release the mouse button
            # await vnc.mouse_up(button="left")
            # 
            # print("Completed drag and drop test")
            # 
            # Test mouse movement and clicking
            # print("\nTesting mouse movement and clicking...")
            # await vnc.move_to(568, 497)
            # await vnc.wait(0.5)
            # result = await vnc.click(button="left")
            # print(f"Click result: {result.output}")
            # screenshot = await vnc.get_screenshot_base64()
            
            # # Test basic mouse movement
            # print("\nTesting mouse movement...")
            # result = await vnc.move_to(475, 100)
            # print(f"Move result: {result.output}")
            # screenshot = await vnc.get_screenshot_base64()
                                
            # # Test clicking
            # print("\nTesting mouse clicks...")
            # result = await vnc.click(button="left")
            # print(f"Click result: {result.output}")
            # screenshot = await vnc.get_screenshot_base64()
            
            # # Test typing
            print("\nTesting keyboard typing...")
            result = await vnc.typing("Hello World!")
            print(f"Typing result: {result.output}")
            # screenshot = await vnc.get_screenshot_base64()
            
            # # Test key press
            # print("\nTesting key press...")
            # result = await vnc.press("enter")
            # print(f"Key press result: {result.output}")
            # screenshot = await vnc.get_screenshot_base64()
            
            # # Test scrolling
            # print("\nTesting scrolling...")
            
            # # Move to a specific position first (e.g., middle of screen)
            # await vnc.move_to(500, 400)
            # await vnc.wait(0.5)
            
            # # Scroll down
            # result = await vnc.scroll(amount=-3)
            # print(f"Scroll down result: {result.output}")
            # await vnc.wait(1)
            
            # # Scroll up
            # result = await vnc.scroll(amount=3)
            # print(f"Scroll up result: {result.output}")
            
            # # First move to start position
            # await vnc.move_to(475, 200)
            # await vnc.wait(0.2)
            
            # # Perform drag to target
            # result = await vnc.drag_to(500, 50)
            # print(f"Drag result: {result.output}")
                  
            # screenshot = await vnc.get_screenshot_base64()
            # print("\nAll tests completed successfully!")
            
        except Exception as e:
            print(f"Test error: {e}")
        finally:
            if vnc:
                print("\nCleaning up...")
                # Add a small delay before cleanup
                await asyncio.sleep(0.1)
                await vnc._cleanup()
                # Ensure we close the event loop properly
                await asyncio.get_event_loop().shutdown_asyncgens()

    # Run the test
    asyncio.run(test_vnc_tool()) 