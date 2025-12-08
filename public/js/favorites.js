// Favorites functionality
document.addEventListener('DOMContentLoaded', function () {
    const favoriteBtns = document.querySelectorAll('[data-favorite-btn]');

    favoriteBtns.forEach(btn => {
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const type = this.dataset.favoriteType; // 'resource' or 'course'
            const id = this.dataset.favoriteId;

            if (!type || !id) return;

            try {
                const response = await fetch(`/favorites/${type}s/${id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Update button state
                    if (data.action === 'added') {
                        this.classList.add('active');
                        this.innerHTML = '❤️ Favorited';
                        showNotification('Added to favorites!', 'success');
                    } else {
                        this.classList.remove('active');
                        this.innerHTML = '🤍 Add to Favorites';
                        showNotification('Removed from favorites', 'info');
                    }
                } else {
                    showNotification(data.error || 'Error updating favorites', 'error');
                }
            } catch (error) {
                console.error('Favorite error:', error);
                showNotification('Error updating favorites', 'error');
            }
        });
    });

    // Check favorite status on page load
    async function checkFavoriteStatus() {
        favoriteBtns.forEach(async btn => {
            const type = btn.dataset.favoriteType;
            const id = btn.dataset.favoriteId;

            if (!type || !id) return;

            try {
                const response = await fetch(`/favorites/check/${type}/${id}`);
                const data = await response.json();

                if (data.isFavorited) {
                    btn.classList.add('active');
                    btn.innerHTML = '❤️ Favorited';
                }
            } catch (error) {
                console.error('Check favorite error:', error);
            }
        });
    }

    if (favoriteBtns.length > 0) {
        checkFavoriteStatus();
    }
});

// Helper function for notifications (reuse from reviews.js if needed)
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
