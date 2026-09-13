const SUPABASE_URL = 'https://myfcyubdhxzthhdgustu.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_Wjqf-ZZtYTcovUi7k469SQ_ihmUsqzu';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


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

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = 'messages.html';
    }
}

checkExistingSession();


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const email = document
        .getElementById('email')
        .value
        .trim();

    const password = document
        .getElementById('password')
        .value;


    // Clear previous status
    loginStatus.textContent = '';


    // Basic validation
    if (!email || !password) {

        loginStatus.textContent =
            'Please enter your email and password.';

        return;
    }


    // Disable button while logging in
    loginButton.disabled = true;
    loginButton.textContent = 'Signing In...';


    try {

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (error) {
            throw error;
        }


        // Successful login
        loginStatus.textContent =
            'Login successful. Redirecting...';

        loginStatus.style.color = '#2F6B45';


        // Give Supabase a moment to store the session
        setTimeout(() => {
            window.location.href = 'messages.html';
        }, 500);

    } catch (error) {

        console.error('Login error:', error);

        loginStatus.textContent =
            error.message || 'Unable to sign in.';

        loginStatus.style.color = '#7B2E2E';

        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }

});