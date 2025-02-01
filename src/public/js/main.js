        function toggleKeywords() {
            const content = document.getElementById('keywords-content');
            const toggle = document.getElementById('keywords-toggle');
            content.classList.toggle('expanded');
            toggle.style.transform = content.classList.contains('expanded') ? 'rotate(180deg)' : '';
        }

        const activeFilters = new Set();

        function toggleFilter(element) {
            const keyword = element.dataset.keyword || element.textContent.trim();
            if (activeFilters.has(keyword)) {
                activeFilters.delete(keyword);
                element.classList.remove('active-filter');
            } else {
                activeFilters.add(keyword);
                element.classList.add('active-filter');
            }
            updateFilters();
            filterBooks();
        }

        function updateFilters() {
            const filterContainer = document.getElementById('active-filters');
            filterContainer.innerHTML = '';
            activeFilters.forEach(filter => {
                const filterTag = document.createElement('span');
                filterTag.className = 'filter-tag';
                filterTag.textContent = filter;
                filterTag.onclick = () => removeFilter(filter);
                filterContainer.appendChild(filterTag);
            });
        }

        function removeFilter(filter) {
            activeFilters.delete(filter);
            document.querySelectorAll('.keyword').forEach(keyword => {
                if (keyword.textContent.trim() === filter || keyword.dataset.keyword === filter) {
                    keyword.classList.remove('active-filter');
                }
            });
            updateFilters();
            filterBooks();
        }

        function filterBooks() {
            const books = document.querySelectorAll('.book-card');
            books.forEach(book => {
                const keywordsData = book.dataset.keywords || '';
                const keywords = keywordsData ? keywordsData.split(',').map(k => k.trim()) : [];
                const shouldShow = activeFilters.size === 0 || [...activeFilters].every(filter => keywords.includes(filter));
                book.style.display = shouldShow ? 'block' : 'none';
            });
        }
        async function downloadBook(bookId) {
            try {
                const response = await fetch(`/api/download/${bookId}`);
                if (!response.ok) throw new Error('Falló la descarga');
                const data = await response.text();
                console.log(data);
                // Create a temporary link to trigger the download
                const link = document.createElement('a');
                link.href = data; // Assuming the API returns {url: "download_url"}
                link.target = '_blank';
                link.download = ''; // This will use the server's filename
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Error al descargar el libro:', error);
                alert('No se pudo descargar el libro. Por favor intente más tarde.');
            }
        }