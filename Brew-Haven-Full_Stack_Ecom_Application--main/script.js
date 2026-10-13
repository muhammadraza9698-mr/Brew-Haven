// Global variables
let menuItems = [];
let nextId = 7;

// Initialize the application
function init() {
    loadMenuItems();
    setupEventListeners();
}

// Load menu items from localStorage or JSON file
function loadMenuItems() {
    // Try to load from localStorage first
    const storedItems = localStorage.getItem('menuItems');
    
    if (storedItems) {
        menuItems = JSON.parse(storedItems);
        nextId = Math.max(...menuItems.map(item => item.id)) + 1;
        displayMenuItems(menuItems);
    } else {
        // If no localStorage data, load from JSON file
        fetch('menu.json')
            .then(response => response.json())
            .then(data => {
                menuItems = data;
                nextId = Math.max(...menuItems.map(item => item.id)) + 1;
                saveToLocalStorage();
                displayMenuItems(menuItems);
            })
            .catch(error => {
                console.error('Error loading menu:', error);
                alert('Error loading menu data. Please refresh the page.');
            });
    }
}

// Save menu items to localStorage
function saveToLocalStorage() {
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
}

// Display menu items on the page
function displayMenuItems(items) {
    const container = document.getElementById('menuContainer');
    const noResults = document.getElementById('noResults');
    
    if (items.length === 0) {
        container.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    container.innerHTML = items.map(item => `
        <div class="menu-item">
            <h3>
                ${item.name}
                <span class="price">$${item.price.toFixed(2)}</span>
            </h3>
            <p class="description">${item.description}</p>
            ${item.isNew ? '<span class="badge">New Item</span>' : ''}
        </div>
    `).join('');
}

// Filter menu items based on search term
function filterMenuItems(searchTerm) {
    const filtered = menuItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayMenuItems(filtered);
}

// Add new menu item
function addMenuItem(name, price, description) {
    const newItem = {
        id: nextId++,
        name: name,
        price: parseFloat(price),
        description: description,
        isNew: true
    };
    
    menuItems.push(newItem);
    saveToLocalStorage();
    displayMenuItems(menuItems);
    
    // Show success message
    alert('Item added successfully to the menu!');
}

// Setup event listeners
function setupEventListeners() {
    // Search box listener
    const searchBox = document.getElementById('searchBox');
    searchBox.addEventListener('input', (e) => {
        filterMenuItems(e.target.value);
    });

    // Toggle form button listener
    const toggleFormBtn = document.getElementById('toggleFormBtn');
    toggleFormBtn.addEventListener('click', () => {
        const form = document.getElementById('addItemForm');
        form.classList.toggle('hidden');
    });

    // Form submission listener
    const menuForm = document.getElementById('menuForm');
    menuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('itemName').value.trim();
        const price = document.getElementById('itemPrice').value;
        const description = document.getElementById('itemDescription').value.trim();
        
        // Validate inputs
        if (!name || !price || !description) {
            alert('Please fill in all fields');
            return;
        }
        
        if (parseFloat(price) <= 0) {
            alert('Price must be greater than 0');
            return;
        }
        
        addMenuItem(name, price, description);
        
        // Reset form and hide it
        menuForm.reset();
        document.getElementById('addItemForm').classList.add('hidden');
    });
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);