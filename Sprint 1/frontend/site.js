const authMenu = document.getElementById("authMenu");
const userEmail = localStorage.getItem("userEmail");

if (authMenu && userEmail) {
    authMenu.innerHTML = `
        <div class="dropdown">
            <a class="dropdown__toggle" href="/profile">Profile</a>
            <div class="dropdown__menu">
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
