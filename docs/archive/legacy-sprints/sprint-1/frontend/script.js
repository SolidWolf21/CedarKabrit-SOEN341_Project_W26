let currentUserEmail = null;

// Registration
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (users[email]) {
        alert('User already exists!');
        return;
    }

    users[email] = { name, email, password, profile: {} };
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registration successful!');
    this.reset();
});

// Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (!users[email]) {
        alert('Invalid email!');
        return;
    }
    if (users[email].password !== password) {
        alert('Incorrect password!');
        return;
    }

    currentUserEmail = email;
    const currentUser = users[email];
    document.getElementById('profileSection').classList.remove('hidden');

    document.getElementById('diet').value = (currentUser.profile && currentUser.profile.diet) || '';
    document.getElementById('allergies').value = (currentUser.profile && currentUser.profile.allergies) || '';

    alert('Login successful!');
    this.reset();
});

// Profile Management and save profile
document.getElementById('profileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!currentUserEmail) {
        alert('Please log in first!');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const diet = document.getElementById('diet').value;
    const allergies = document.getElementById('allergies').value;

    users[currentUserEmail].profile = users[currentUserEmail].profile || {};
    users[currentUserEmail].profile.diet = diet;
    users[currentUserEmail].profile.allergies = allergies;

    localStorage.setItem('users', JSON.stringify(users));
    alert('Profile updated successfully!');
});