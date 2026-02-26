const authMenu = document.getElementById("authMenu");
const userEmail = localStorage.getItem("userEmail");
const isHome = window.location.pathname === "/";
const guestHeroActions = document.getElementById("guestHeroActions");
const authHeroActions = document.getElementById("authHeroActions");

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
