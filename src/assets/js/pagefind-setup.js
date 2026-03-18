
document.addEventListener('DOMContentLoaded', async () => {
    new PagefindUI({ element: "#search-results", showSubResults: false })

    const searchForm = document.querySelector('#search-form')
    const searchInput = document.querySelector('#search-input')
    searchInput.value = new URLSearchParams(window.location.search).get('search') || '';

    const pagefindSearchInput = document.querySelector('.pagefind-ui__search-input')
    pagefindSearchInput.value = searchInput.value;
    pagefindSearchInput.dispatchEvent(new Event('input', { bubbles: true }))
    pagefindSearchInput.style.display = 'none'

    const pagefindClearButton = document.querySelector('.pagefind-ui__search-clear');
    pagefindClearButton.style.display = 'none'

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value
        pagefindSearchInput.value = query
        pagefindSearchInput.dispatchEvent(new Event('input', { bubbles: true }))
    });

    // searchForm.addEventListener('submit', (e) => {
    //     e.preventDefault()
    //     const query = searchInput.value
    //     pagefindSearchInput.value = query
    //     pagefindSearchInput.dispatchEvent(new Event('input', { bubbles: true }))
    // })
});