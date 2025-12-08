// Review and Rating System Client-Side
document.addEventListener('DOMContentLoaded', function () {
    const reviewForm = document.getElementById('reviewForm');
    const starRating = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('ratingInput');
    const reviewsList = document.getElementById('reviewsList');

    // Star rating interaction
    starRating.forEach((star, index) => {
        star.addEventListener('click', function () {
            const rating = index + 1;
            ratingInput.value = rating;
            updateStarDisplay(rating);
        });

        star.addEventListener('mouseenter', function () {
            const rating = index + 1;
            updateStarDisplay(rating, true);
        });
    });

    // Reset stars on mouse leave
    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', function () {
            const currentRating = ratingInput.value || 0;
            updateStarDisplay(parseInt(currentRating));
        });
    }

    function updateStarDisplay(rating, hover = false) {
        starRating.forEach((star, index) => {
            if (index < rating) {
                star.classList.add(hover ? 'hover' : 'active');
                star.classList.remove(hover ? 'active' : 'hover');
            } else {
                star.classList.remove('active', 'hover');
            }
        });
    }

    // Submit review
    if (reviewForm) {
        reviewForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const resourceId = this.dataset.resourceId;
            const rating = ratingInput.value;
            const comment = document.getElementById('reviewComment').value;

            if (!rating) {
                showNotification('Please select a rating', 'error');
                return;
            }

            try {
                const response = await fetch(`/reviews/${resourceId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ rating, comment })
                });

                const data = await response.json();

                if (data.success) {
                    showNotification('Review submitted successfully!', 'success');
                    reviewForm.reset();
                    ratingInput.value = '';
                    updateStarDisplay(0);

                    // Reload reviews
                    loadReviews(resourceId);
                } else {
                    showNotification(data.error || 'Error submitting review', 'error');
                }
            } catch (error) {
                console.error('Submit review error:', error);
                showNotification('Error submitting review', 'error');
            }
        });
    }

    // Load reviews
    async function loadReviews(resourceId, sort = 'newest', page = 1) {
        try {
            const response = await fetch(`/reviews/${resourceId}?sort=${sort}&page=${page}`);
            const data = await response.json();

            if (reviewsList) {
                if (data.reviews.length === 0) {
                    reviewsList.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
                } else {
                    reviewsList.innerHTML = data.reviews.map(review => createReviewHTML(review)).join('');
                }

                // Update average rating display
                updateAverageRating(data.averageRating, data.totalReviews);

                // Update rating distribution
                updateRatingDistribution(data.distribution, data.totalReviews);
            }
        } catch (error) {
            console.error('Load reviews error:', error);
        }
    }

    function createReviewHTML(review) {
        const date = new Date(review.date).toLocaleDateString();
        const stars = '★'.repeat(review.value) + '☆'.repeat(5 - review.value);

        return `
            <div class="review-item">
                <div class="review-header">
                    <div class="reviewer-info">
                        <img src="${review.user.profile?.avatar || '/images/default-avatar.png'}" 
                             alt="${review.user.username}" 
                             class="reviewer-avatar">
                        <div>
                            <strong>${review.user.username}</strong>
                            <div class="review-rating">${stars}</div>
                        </div>
                    </div>
                    <span class="review-date">${date}</span>
                </div>
                ${review.comment ? `<p class="review-comment">${escapeHtml(review.comment)}</p>` : ''}
                <div class="review-actions">
                    <button class="btn-helpful" data-review-id="${review._id}">
                        👍 Helpful
                    </button>
                    <button class="btn-report" data-review-id="${review._id}">
                        🚩 Report
                    </button>
                </div>
            </div>
        `;
    }

    function updateAverageRating(average, total) {
        const avgElement = document.getElementById('averageRating');
        const totalElement = document.getElementById('totalReviews');

        if (avgElement) avgElement.textContent = average;
        if (totalElement) totalElement.textContent = `(${total} reviews)`;
    }

    function updateRatingDistribution(distribution, total) {
        for (let i = 1; i <= 5; i++) {
            const bar = document.getElementById(`rating-${i}-bar`);
            const count = document.getElementById(`rating-${i}-count`);

            if (bar && count) {
                const percentage = total > 0 ? (distribution[i] / total) * 100 : 0;
                bar.style.width = `${percentage}%`;
                count.textContent = distribution[i];
            }
        }
    }

    // Sort reviews
    const sortSelect = document.getElementById('reviewSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            const resourceId = reviewForm?.dataset.resourceId;
            if (resourceId) {
                loadReviews(resourceId, this.value);
            }
        });
    }

    // Helper functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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

    // Initial load
    if (reviewForm && reviewForm.dataset.resourceId) {
        loadReviews(reviewForm.dataset.resourceId);
    }
});
