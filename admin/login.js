const ADMIN_API_URL =
    'https://tehsaad-portfolio-api.srizwan-bscs26seecs.workers.dev';


// =========================================================
// ELEMENTS
// =========================================================

const loginForm = document.getElementById('adminLoginForm');
const loginButton = document.getElementById('loginButton');
const loginStatus = document.getElementById('loginStatus');


// =========================================================
// CHECK EXISTING SESSION
// =========================================================

async function checkExistingSession() {

    try {

        const response = await fetch(
            `${ADMIN_API_URL}/api/admin/session`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        if (response.ok) {

            const result = await response.json();

            if (result.authenticated) {
                window.location.href = 'messages.html';
            }
        }

    } catch (error) {

        console.error(
            'Session check error:',
            error
        );
    }
}

checkExistingSession();


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener(
    'submit',
    async (event) => {

        event.preventDefault();

        const email = document
            .getElementById('email')
            .value
            .trim();

        const password = document
            .getElementById('password')
            .value;


        loginStatus.textContent = '';


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!email || !password) {

            loginStatus.textContent =
                'Please enter your email and password.';

            return;
        }


        // -------------------------------------------------
        // DISABLE BUTTON
        // -------------------------------------------------

        loginButton.disabled = true;
        loginButton.textContent = 'Signing In...';


        try {

            const response = await fetch(
                `${ADMIN_API_URL}/api/admin/login`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    credentials: 'include',

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


            const result = await response.json();


            // -------------------------------------------------
            // LOGIN FAILED
            // -------------------------------------------------

            if (!response.ok || !result.success) {

                throw new Error(
                    result.error ||
                    'Unable to sign in.'
                );
            }


            // -------------------------------------------------
            // LOGIN SUCCESS
            // -------------------------------------------------

            loginStatus.textContent =
                'Login successful. Redirecting...';

            loginStatus.style.color = '#2F6B45';


            setTimeout(() => {

                window.location.href =
                    'messages.html';

            }, 500);


        } catch (error) {

            console.error(
                'Login error:',
                error
            );

            loginStatus.textContent =
                error.message ||
                'Unable to sign in.';

            loginStatus.style.color =
                '#7B2E2E';

            loginButton.disabled = false;

            loginButton.textContent =
                'Sign In';
        }
    }
);