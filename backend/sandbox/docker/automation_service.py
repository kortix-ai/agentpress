import pyautogui
import time
import os
import sys
from typing import List, Dict, Any, Optional, Union
import io
import base64
from PIL import Image
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum

# Set environment variable for the display if not already set
if 'DISPLAY' not in os.environ:
    os.environ['DISPLAY'] = ':99'

# Try to initialize pyautogui with error handling
try:
    pyautogui.FAILSAFE = False
except Exception as e:
    print(f"Warning: Could not initialize pyautogui: {e}", file=sys.stderr)
    print("This may be due to X11 authentication issues. Continuing anyway.", file=sys.stderr)

## Input Models

class MouseButton(str, Enum):
    left = "left"
    middle = "middle"
    right = "right"

class Position(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None

class MouseAction(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    clicks: Optional[int] = 1
    interval: Optional[float] = 0.0
    button: MouseButton = MouseButton.left
    duration: Optional[float] = 0.0
    
class KeyboardAction(BaseModel):
    key: str

class KeyboardPress(BaseModel):
    keys: Union[str, List[str]]
    presses: Optional[int] = 1
    interval: Optional[float] = 0.0
    
class WriteAction(BaseModel):
    message: str
    interval: Optional[float] = 0.0

class HotkeyAction(BaseModel):
    keys: List[str]
    interval: Optional[float] = 0.0 
    
    
class AutomationService:
    def __init__(self):
        self.router = APIRouter()
        
        # Set fallback to avoid crashes
        pyautogui.FAILSAFE = False
        
        # X error handling
        try:
            # Test if we can get the screen size
            self.screen_width, self.screen_height = pyautogui.size()
            print(f"Screen size detected: {self.screen_width}x{self.screen_height}")
            self.x11_available = True
        except Exception as e:
            print(f"Warning: Could not get screen size: {e}", file=sys.stderr)
            print("X11 functionality may be limited. Using fallback values.", file=sys.stderr)
            self.screen_width = 1920
            self.screen_height = 1080
            self.x11_available = False

        self.router.get("/automation/mouse/position")(self.get_mouse_position)
        self.router.post("/automation/mouse/move")(self.move_mouse)
        self.router.post("/automation/mouse/click")(self.click_mouse)
        self.router.post("/automation/mouse/down")(self.mouse_down)
        self.router.post("/automation/mouse/up")(self.mouse_up)
        self.router.post("/automation/mouse/drag")(self.drag_mouse)
        self.router.post("/automation/mouse/scroll")(self.scroll_mouse)
        self.router.post("/automation/keyboard/down")(self.key_down)
        self.router.post("/automation/keyboard/up")(self.key_up)
        self.router.post("/automation/keyboard/press")(self.press_key)
        self.router.post("/automation/keyboard/write")(self.write_text)
        self.router.post("/automation/keyboard/hotkey")(self.press_hotkey)
        self.router.post("/automation/screenshot")(self.take_screenshot)

    async def get_mouse_position(self):
        try:
            x, y = pyautogui.position()
            return {"x": x, "y": y}
        except Exception as e:
            return {"error": str(e), "x": 0, "y": 0}

    async def move_mouse(self, action: Position):
        try:
            pyautogui.moveTo(x=action.x, y=action.y)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def click_mouse(self, action: MouseAction):
        try:
            pyautogui.click(x=action.x, y=action.y, clicks=action.clicks,
                          interval=action.interval, button=action.button,
                          duration=action.duration)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def mouse_down(self, action: MouseAction):
        try:
            pyautogui.mouseDown(x=action.x, y=action.y,
                              button=action.button, duration=action.duration)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def mouse_up(self, action: MouseAction):
        try:
            pyautogui.mouseUp(x=action.x, y=action.y,
                            button=action.button, duration=action.duration)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def drag_mouse(self, action: MouseAction):
        try:
            pyautogui.dragTo(x=action.x, y=action.y,
                           duration=action.duration, button=action.button)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def scroll_mouse(self, action: MouseAction):
        try:
            pyautogui.scroll(clicks=action.clicks, x=action.x, y=action.y)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def key_down(self, action: KeyboardAction):
        try:
            pyautogui.keyDown(action.key)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def key_up(self, action: KeyboardAction):
        try:
            pyautogui.keyUp(action.key)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def press_key(self, action: KeyboardPress):
        try:
            pyautogui.press(keys=action.keys, presses=action.presses,
                          interval=action.interval)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def write_text(self, action: WriteAction):
        try:
            pyautogui.write(message=action.message, interval=action.interval)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def press_hotkey(self, action: HotkeyAction):
        try:
            pyautogui.hotkey(*action.keys, interval=action.interval)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def take_screenshot(self) -> Dict[str, str]:
        try:
            screenshot = pyautogui.screenshot()
            img_byte_arr = io.BytesIO()
            screenshot.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            return {"image": base64.b64encode(img_byte_arr).decode()}
        except Exception as e:
            return {"error": str(e)}

# Create a singleton instance
automation_service = AutomationService()     