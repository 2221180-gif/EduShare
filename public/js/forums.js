// Forum functionality
document.addEventListener('DOMContentLoaded', function () {
    const replyForm = document.getElementById('replyForm');
    const replyBtn = document.getElementById('submitReply');

    // Submit reply
    if (replyForm) {
        replyForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const threadId = this.dataset.threadId;
            const content = document.getElementById('replyContent').value;
            const isAnswer = document.getElementById('markAsAnswer')?.checked || false;

            if (!content.trim()) {
                showNotification('Please enter a reply', 'warning');
                return;
            }

            try {
                const response = await fetch(`/forums/${threadId}/reply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content, isAnswer })
                });

                const data = await response.json();

                if (data.success) {
                    showNotification(data.message, 'success');

                    // Add reply to page
                    addReplyToPage(data.reply);

                    // Clear form
                    replyForm.reset();
                } else {
                    showNotification(data.error || 'Error posting reply', 'error');
                }
            } catch (error) {
                console.error('Reply error:', error);
                showNotification('Error posting reply', 'error');
            }
        });
    }

    function addReplyToPage(reply) {
        const repliesContainer = document.getElementById('repliesContainer');
        if (!repliesContainer) return;

        const replyEl = document.createElement('div');
        replyEl.className = 'forum-reply';
        if (reply.isAnswer) replyEl.classList.add('answer');

        replyEl.innerHTML = `
            <div class="reply-header">
                <div class="author-info">
                    <img src="${reply.author.profile?.avatar || '/images/default-avatar.png'}" 
                         alt="${reply.author.username}" 
                         class="author-avatar">
                    <div>
                        <strong>${reply.author.username}</strong>
                        ${reply.isAnswer ? '<span class="badge badge-success">Answer</span>' : ''}
                        <div class="reply-date">${new Date(reply.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="vote-controls">
                    <button class="vote-btn" onclick="voteReply('${reply._id}', 'up')">
                        ▲ <span id="upvotes-${reply._id}">0</span>
                    </button>
                    <button class="vote-btn" onclick="voteReply('${reply._id}', 'down')">
                        ▼ <span id="downvotes-${reply._id}">0</span>
                    </button>
                </div>
            </div>
            <div class="reply-content">${escapeHtml(reply.content)}</div>
        `;

        repliesContainer.appendChild(replyEl);
    }

    // Vote on thread
    window.voteThread = async function (threadId, type) {
        try {
            const response = await fetch(`/forums/${threadId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type })
            });

            const data = await response.json();

            if (data.success) {
                // Update vote counts
                document.getElementById('upvotes').textContent = data.upvotes;
                document.getElementById('downvotes').textContent = data.downvotes;
                document.getElementById('score').textContent = data.score;
            } else {
                showNotification(data.error || 'Error voting', 'error');
            }
        } catch (error) {
            console.error('Vote error:', error);
            showNotification('Error voting', 'error');
        }
    };

    // Vote on reply
    window.voteReply = async function (replyId, type) {
        const threadId = document.getElementById('threadId')?.value;
        if (!threadId) return;

        try {
            const response = await fetch(`/forums/${threadId}/reply/${replyId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type })
            });

            const data = await response.json();

            if (data.success) {
                // Update vote counts
                const upvotesEl = document.getElementById(`upvotes-${replyId}`);
                const downvotesEl = document.getElementById(`downvotes-${replyId}`);

                if (upvotesEl) upvotesEl.textContent = data.upvotes;
                if (downvotesEl) downvotesEl.textContent = data.downvotes;
            } else {
                showNotification(data.error || 'Error voting', 'error');
            }
        } catch (error) {
            console.error('Vote reply error:', error);
            showNotification('Error voting', 'error');
        }
    };

    // Mark reply as answer
    window.markAsAnswer = async function (replyId) {
        const threadId = document.getElementById('threadId')?.value;
        if (!threadId) return;

        try {
            const response = await fetch(`/forums/${threadId}/reply/${replyId}/mark-answer`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, 'success');
                // Reload page to show updated answer status
                window.location.reload();
            } else {
                showNotification(data.error || 'Error marking answer', 'error');
            }
        } catch (error) {
            console.error('Mark answer error:', error);
            showNotification('Error marking answer', 'error');
        }
    };

    // Delete thread
    window.deleteThread = async function (threadId) {
        if (!confirm('Are you sure you want to delete this thread?')) {
            return;
        }

        try {
            const response = await fetch(`/forums/${threadId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showNotification(data.message, 'success');
                window.location.href = '/forums';
            } else {
                showNotification(data.error || 'Error deleting thread', 'error');
            }
        } catch (error) {
            console.error('Delete thread error:', error);
            showNotification('Error deleting thread', 'error');
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
