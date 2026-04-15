(() => {
    const storageKey = "userEmail";

    function getUserEmail() {
        return localStorage.getItem(storageKey);
    }

    function setUserEmail(email) {
        localStorage.setItem(storageKey, email);
    }

    function clearUserEmail() {
        localStorage.removeItem(storageKey);
    }

    function requireUser(redirectPath = "/signin") {
        const userEmail = getUserEmail();
        if (!userEmail) {
            window.location.replace(redirectPath);
            return null;
        }
        return userEmail;
    }

    window.authSession = {
        getUserEmail,
        setUserEmail,
        clearUserEmail,
        requireUser
    };
})();
