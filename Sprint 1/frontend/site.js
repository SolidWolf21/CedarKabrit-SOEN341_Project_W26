const authMenu = document.getElementById("authMenu");
const userEmail = localStorage.getItem("userEmail");
const guestHeroActions = document.getElementById("guestHeroActions");
const authHeroActions = document.getElementById("authHeroActions");
const currentPath = window.location.pathname;

if (userEmail && (currentPath === "/signin" || currentPath === "/signup")) {
    window.location.replace("/profile");
}

if (!userEmail && currentPath === "/profile") {
    window.location.replace("/signin");
}

if (guestHeroActions && authHeroActions) {
    if (userEmail) {
        guestHeroActions.hidden = true;
        authHeroActions.hidden = false;
    } else {
        guestHeroActions.hidden = false;
        authHeroActions.hidden = true;
    }
}

if (authMenu && userEmail) {
    authMenu.innerHTML = `
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
