// Advanced Search and Filter Functionality
document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const gradeFilter = document.getElementById('gradeFilter');
    const sortSelect = document.getElementById('sortSelect');
    const minRatingFilter = document.getElementById('minRatingFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');

    // Auto-submit form on filter change
    if (subjectFilter) {
        subjectFilter.addEventListener('change', function () {
            if (searchForm) searchForm.submit();
        });
    }

    if (gradeFilter) {
        gradeFilter.addEventListener('change', function () {
            if (searchForm) searchForm.submit();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            if (searchForm) searchForm.submit();
        });
    }

    if (minRatingFilter) {
        minRatingFilter.addEventListener('change', function () {
            if (searchForm) searchForm.submit();
        });
    }

    // Clear all filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/resources';
        });
    }

    // Search autocomplete
    if (searchInput) {
        let searchTimeout;
        const autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-results';
        searchInput.parentNode.appendChild(autocompleteContainer);

        searchInput.addEventListener('input', function () {
            const query = this.value.trim();

            clearTimeout(searchTimeout);

            if (query.length < 2) {
                autocompleteContainer.innerHTML = '';
                autocompleteContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`/resources/autocomplete?q=${encodeURIComponent(query)}`);
                    const suggestions = await response.json();

                    if (suggestions.length > 0) {
                        autocompleteContainer.innerHTML = suggestions.map(item =>
                            `<div class="autocomplete-item" data-value="${item}">${highlightMatch(item, query)}</div>`
                        ).join('');
                        autocompleteContainer.style.display = 'block';

                        // Add click handlers to autocomplete items
                        autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
                            item.addEventListener('click', function () {
                                searchInput.value = this.dataset.value;
                                autocompleteContainer.innerHTML = '';
                                autocompleteContainer.style.display = 'none';
                                if (searchForm) searchForm.submit();
                            });
                        });
                    } else {
                        autocompleteContainer.innerHTML = '';
                        autocompleteContainer.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Autocomplete error:', error);
                }
            }, 300);
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', function (e) {
            if (e.target !== searchInput) {
                autocompleteContainer.innerHTML = '';
                autocompleteContainer.style.display = 'none';
            }
        });
    }

    // Highlight matching text in autocomplete
    function highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    // Active filter count badge
    function updateFilterBadge() {
        const activeFilters = [];

        if (subjectFilter && subjectFilter.value !== 'all') activeFilters.push('subject');
        if (gradeFilter && gradeFilter.value !== 'all') activeFilters.push('grade');
        if (minRatingFilter && minRatingFilter.value) activeFilters.push('rating');
        if (searchInput && searchInput.value.trim()) activeFilters.push('search');

        const badge = document.getElementById('filterBadge');
        if (badge) {
            if (activeFilters.length > 0) {
                badge.textContent = activeFilters.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    updateFilterBadge();
});

// Infinite scroll for resources (optional enhancement)
function initInfiniteScroll() {
    let page = 1;
    let loading = false;
    let hasMore = true;

    const resourcesContainer = document.getElementById('resourcesContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!resourcesContainer) return;

    window.addEventListener('scroll', async function () {
        if (loading || !hasMore) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 500;

        if (scrollPosition >= threshold) {
            loading = true;
            if (loadingIndicator) loadingIndicator.style.display = 'block';

            page++;

            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('page', page);

            try {
                const response = await fetch(`/resources/api/load-more?${urlParams.toString()}`);
                const data = await response.json();

                if (data.resources && data.resources.length > 0) {
                    data.resources.forEach(resource => {
                        const card = createResourceCard(resource);
                        resourcesContainer.appendChild(card);
                    });

                    if (page >= data.pagination.pages) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error('Error loading more resources:', error);
            } finally {
                loading = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        }
    });
}

function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `
        <a href="/resources/${resource._id}">
            <div class="resource-card-header">
                <h3>${resource.title}</h3>
                ${resource.averageRating ? `
                    <div class="rating">
                        ${'★'.repeat(Math.round(resource.averageRating))}${'☆'.repeat(5 - Math.round(resource.averageRating))}
                        <span>${resource.averageRating}</span>
                    </div>
                ` : ''}
            </div>
            <p>${resource.description.substring(0, 100)}...</p>
            <div class="resource-meta">
                <span class="subject">${resource.subject}</span>
                <span class="grade">${resource.gradeLevel}</span>
                ${resource.isPremium ? '<span class="premium-badge">Premium</span>' : ''}
            </div>
        </a>
    `;
    return card;
}
