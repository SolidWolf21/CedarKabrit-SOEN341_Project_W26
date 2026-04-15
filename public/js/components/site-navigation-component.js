(() => {
    const authSession = window.authSession;
    const authMenu = document.getElementById("authMenu");
    const userEmail = authSession ? authSession.getUserEmail() : localStorage.getItem("userEmail");
    const guestHeroActions = document.getElementById("guestHeroActions");
    const authHeroActions = document.getElementById("authHeroActions");
    const currentPath = window.location.pathname;
    const protectedPaths = ["/profile", "/recipes/new", "/recipes/mine", "/recipes/browse", "/planner/weekly"];
    const guestOnlyPaths = ["/signin", "/signup"];

    if (userEmail && guestOnlyPaths.includes(currentPath)) {
        window.location.replace("/profile");
    }

    if (!userEmail && protectedPaths.includes(currentPath)) {
        window.location.replace("/signin");
    }

    function bindSignOut(linkId) {
        const signOutLink = document.getElementById(linkId);
        if (!signOutLink) {
            return;
        }

        signOutLink.addEventListener("click", (event) => {
            event.preventDefault();
            if (authSession) {
                authSession.clearUserEmail();
            } else {
                localStorage.removeItem("userEmail");
            }
            window.location.href = "/";
        });
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
            <a class="nav-cta" href="/recipes/mine">My Recipes</a>
            <a class="nav-cta" href="/planner/weekly">Weekly Meal Planner</a>
            <div class="dropdown">
                <a class="dropdown__toggle" href="/profile">My Profile</a>
                <div class="dropdown__menu">
                    <a href="#" id="signOutLink">Sign Out</a>
                </div>
            </div>
        `;

        bindSignOut("signOutLink");
    } else {
        bindSignOut("staticSignOutLink");
    }
})();
