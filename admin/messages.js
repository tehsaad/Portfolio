const ADMIN_API_URL =
    'https://tehsaad-portfolio-api.srizwan-bscs26seecs.workers.dev';


// =========================================================
// DOM ELEMENTS
// =========================================================

const adminEmail =
    document.getElementById('adminEmail');

const logoutButton =
    document.getElementById('logoutButton');

const messagesContainer =
    document.getElementById('messagesContainer');

const messageCount =
    document.getElementById('messageCount');


// =========================================================
// CHECK ADMIN SESSION
// =========================================================

async function checkSession() {

    try {

        const response = await fetch(
            `${ADMIN_API_URL}/api/admin/session`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );

        const result = await response.json();


        if (
            !response.ok ||
            !result.authenticated
        ) {
            window.location.href = 'login.html';
            return null;
        }


        adminEmail.textContent =
            result.email;

        return result;

    } catch (error) {

        console.error(
            'Session check error:',
            error
        );

        window.location.href =
            'login.html';

        return null;
    }
}


// =========================================================
// LOAD MESSAGES
// =========================================================

async function loadMessages() {

    messagesContainer.innerHTML = `
        <div class="loading-state">
            Loading messages...
        </div>
    `;


    try {

        const response = await fetch(
            `${ADMIN_API_URL}/api/admin/messages`,
            {
                method: 'GET',
                credentials: 'include'
            }
        );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.error ||
                'Unable to load messages.'
            );
        }


        const data =
            result.messages || [];


        // -------------------------------------------------
        // MESSAGE COUNT
        // -------------------------------------------------

        messageCount.textContent =
            data.length;


        // -------------------------------------------------
        // NO MESSAGES
        // -------------------------------------------------

        if (data.length === 0) {

            messagesContainer.innerHTML = `
                <div class="loading-state">
                    No messages yet.
                </div>
            `;

            return;
        }


        // -------------------------------------------------
        // TABLE
        // -------------------------------------------------

        messagesContainer.innerHTML = `
            <div class="messages-table-wrapper">

                <table class="messages-table">

                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Subject</th>
                            <th>Message</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody id="messagesTableBody"></tbody>

                </table>

            </div>
        `;


        const tableBody =
            document.getElementById(
                'messagesTableBody'
            );


        // -------------------------------------------------
        // CREATE TABLE ROWS
        // -------------------------------------------------

        data.forEach(message => {

            const row =
                document.createElement('tr');

            row.className =
                'message-row';


            row.innerHTML = `
                <td class="message-name">
                    ${escapeHTML(message.name)}
                </td>

                <td class="message-email">
                    ${escapeHTML(message.email)}
                </td>

                <td class="message-subject">
                    ${escapeHTML(
                        message.subject || '—'
                    )}
                </td>

                <td class="message-preview">
                    ${escapeHTML(message.message)}
                </td>

                <td class="message-date">
                    ${formatDate(
                        message.created_at
                    )}
                </td>
            `;


            row.addEventListener(
                'click',
                () => {
                    openMessageModal(message);
                }
            );


            tableBody.appendChild(row);
        });


    } catch (error) {

        console.error(
            'Messages API error:',
            error
        );


        messagesContainer.innerHTML = `
            <div class="loading-state">
                Unable to load messages.
            </div>
        `;
    }
}


// =========================================================
// OPEN MESSAGE MODAL
// =========================================================

function openMessageModal(message) {

    const existingModal =
        document.getElementById(
            'messageModal'
        );

    if (existingModal) {
        existingModal.remove();
    }


    const modal =
        document.createElement('div');

    modal.id =
        'messageModal';

    modal.className =
        'message-modal';


    modal.innerHTML = `
        <div class="message-modal-overlay"></div>

        <div class="message-modal-content">

            <button
                class="message-modal-close"
                id="closeMessageModal"
                type="button"
                aria-label="Close message"
            >
                &times;
            </button>

            <div class="modal-label">
                CONTACT MESSAGE
            </div>

            <h2>
                ${escapeHTML(
                    message.subject ||
                    'No Subject'
                )}
            </h2>

            <div class="modal-meta">

                <div class="modal-meta-item">
                    <span>FROM</span>

                    <strong>
                        ${escapeHTML(
                            message.name
                        )}
                    </strong>
                </div>

                <div class="modal-meta-item">
                    <span>EMAIL</span>

                    <a
                        href="mailto:${escapeHTML(
                            message.email
                        )}"
                    >
                        ${escapeHTML(
                            message.email
                        )}
                    </a>
                </div>

                <div class="modal-meta-item">
                    <span>DATE</span>

                    <strong>
                        ${formatDate(
                            message.created_at
                        )}
                    </strong>
                </div>

            </div>

            <div class="modal-message">

                <span>MESSAGE</span>

                <p>
                    ${escapeHTML(
                        message.message
                    )}
                </p>

            </div>

            <div class="modal-actions">

                <a
                    class="modal-reply-button"
                    href="mailto:${escapeHTML(
                        message.email
                    )}?subject=${encodeURIComponent(
                        'Re: ' +
                        (
                            message.subject ||
                            'Your message'
                        )
                    )}"
                >
                    Reply by Email
                </a>

                <button
                    class="modal-close-button"
                    id="closeMessageButton"
                    type="button"
                >
                    Close
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    // -------------------------------------------------
    // CLOSE MODAL
    // -------------------------------------------------

    const closeModal = () => {
        modal.remove();

        document.removeEventListener(
            'keydown',
            handleEscape
        );
    };


    document
        .getElementById(
            'closeMessageModal'
        )
        .addEventListener(
            'click',
            closeModal
        );


    document
        .getElementById(
            'closeMessageButton'
        )
        .addEventListener(
            'click',
            closeModal
        );


    document
        .querySelector(
            '.message-modal-overlay'
        )
        .addEventListener(
            'click',
            closeModal
        );


    // -------------------------------------------------
    // ESCAPE KEY
    // -------------------------------------------------

    const handleEscape = (event) => {

        if (event.key === 'Escape') {
            closeModal();
        }
    };


    document.addEventListener(
        'keydown',
        handleEscape
    );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return '';
    }


    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(dateString) {

    if (!dateString) {
        return '';
    }


    const date =
        new Date(dateString);


    return date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}


// =========================================================
// LOGOUT
// =========================================================

logoutButton.addEventListener(
    'click',
    async () => {

        logoutButton.disabled = true;

        logoutButton.textContent =
            'Signing Out...';


        try {

            await fetch(
                `${ADMIN_API_URL}/api/admin/logout`,
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

        } catch (error) {

            console.error(
                'Logout error:',
                error
            );
        }


        window.location.href =
            'login.html';
    }
);


// =========================================================
// INITIALIZE DASHBOARD
// =========================================================

async function init() {

    const session =
        await checkSession();


    if (!session) {
        return;
    }


    await loadMessages();
}


init();