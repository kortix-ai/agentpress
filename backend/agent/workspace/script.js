document.addEventListener('DOMContentLoaded', function() {
    // Color changing functionality
    const changeColorBtn = document.getElementById('changeColorBtn');
    const colorDisplay = document.getElementById('colorDisplay');
    
    changeColorBtn.addEventListener('click', function() {
        // Generate a random color
        const randomColor = getRandomColor();
        colorDisplay.style.backgroundColor = randomColor;
        colorDisplay.textContent = randomColor;
        colorDisplay.style.color = getContrastColor(randomColor);
        colorDisplay.style.display = 'flex';
        colorDisplay.style.justifyContent = 'center';
        colorDisplay.style.alignItems = 'center';
        colorDisplay.style.fontWeight = 'bold';
    });
    
    // Counter functionality
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');
    const counterValue = document.getElementById('counterValue');
    
    let count = 0;
    
    decrementBtn.addEventListener('click', function() {
        count--;
        updateCounter();
    });
    
    incrementBtn.addEventListener('click', function() {
        count++;
        updateCounter();
    });
    
    function updateCounter() {
        counterValue.textContent = count;
        // Add some visual feedback
        counterValue.style.color = count < 0 ? 'red' : count > 0 ? 'green' : '#333';
    }
    
    // Todo List functionality
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoList = document.getElementById('todoList');
    
    // Load todos from localStorage
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    
    // Render existing todos
    renderTodos();
    
    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    function addTodo() {
        const todoText = todoInput.value.trim();
        if (todoText) {
            const todo = {
                id: Date.now(),
                text: todoText,
                completed: false
            };
            
            todos.push(todo);
            saveTodos();
            renderTodos();
            todoInput.value = '';
            todoInput.focus();
        }
    }
    
    function toggleTodo(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                todo.completed = !todo.completed;
            }
            return todo;
        });
        saveTodos();
        renderTodos();
    }
    
    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
    }
    
    function renderTodos() {
        todoList.innerHTML = '';
        
        if (todos.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'No tasks yet. Add one above!';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '10px';
            emptyMessage.style.color = '#888';
            todoList.appendChild(emptyMessage);
            return;
        }
        
        todos.forEach(todo => {
            const todoItem = document.createElement('li');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(todo.id));
            
            const todoText = document.createElement('span');
            todoText.className = 'todo-text';
            todoText.textContent = todo.text;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
            
            todoItem.appendChild(checkbox);
            todoItem.appendChild(todoText);
            todoItem.appendChild(deleteBtn);
            
            todoList.appendChild(todoItem);
        });
    }
    
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }
    
    // Helper functions
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    function getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
});