(function () {
    const fab = document.getElementById('search-fab');
    const modal = document.getElementById('search-modal');
    const dismissBtn = document.getElementById('search-dismiss');
    const input = document.getElementById('search-input');
    const goBtn = document.getElementById('search-go');
    const errorEl = document.getElementById('search-error');
    const quickBtns = document.querySelectorAll('.search-quick-btn');

    function openModal() {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        setTimeout(() => input.focus(), 50);
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        errorEl.textContent = '';
    }

    function flyTo(lat, lng, zoom) {
        if (window.map) {
            window.map.flyTo([lat, lng], zoom || 13, { duration: 1.2 });
        }
        closeModal();
    }

    async function geocodeAndFly() {
        const query = input.value.trim();
        if (!query) return;
        errorEl.textContent = '';
        goBtn.disabled = true;
        goBtn.textContent = '…';
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en', 'User-Agent': 'urbanistview/1.0' }
            });
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                flyTo(parseFloat(lat), parseFloat(lon), 13);
                input.value = '';
            } else {
                errorEl.textContent = 'Location not found. Try a different search.';
            }
        } catch (e) {
            errorEl.textContent = 'Search failed. Check your connection and try again.';
        } finally {
            goBtn.disabled = false;
            goBtn.textContent = 'Go';
        }
    }

    fab.addEventListener('click', openModal);
    dismissBtn.addEventListener('click', closeModal);

    goBtn.addEventListener('click', geocodeAndFly);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') geocodeAndFly();
        if (e.key === 'Escape') closeModal();
    });

    quickBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            flyTo(
                parseFloat(btn.dataset.lat),
                parseFloat(btn.dataset.lng),
                parseInt(btn.dataset.zoom, 10)
            );
        });
    });

    // Close when clicking outside the modal inner panel
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });
})();
