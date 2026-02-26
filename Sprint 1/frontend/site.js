const authMenu = document.getElementById("authMenu");
const userEmail = localStorage.getItem("userEmail");
const isHome = window.location.pathname === "/";

if (authMenu && userEmail) {
    authMenu.innerHTML = `
        <a href="/" class="nav-link ${isHome ? "is-active" : ""}">Home</a>
        <div class="dropdown">
            <a class="dropdown__toggle" href="/profile">Profile</a>
            <div class="dropdown__menu">
                <a href="/profile">Account</a>
                <a href="#" id="signOutLink">Sign Out</a>
            </div>
        </div>
    `;

    const signOutLink = document.getElementById("signOutLink");
    signOutLink.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("userEmail");
        window.location.reload();
    });
}
