const authMenu = document.getElementById("authMenu");
const userEmail = localStorage.getItem("userEmail");

if (authMenu && userEmail) {
    authMenu.innerHTML = `
        <a href="#" id="signOutLink">Sign Out</a>
    `;

    const signOutLink = document.getElementById("signOutLink");
    signOutLink.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("userEmail");
        window.location.reload();
    });
}
