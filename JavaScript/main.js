const API = 'https://www.themealdb.com/api/json/v1/1/';
const FALLBACK_IMAGE = '/mnt/data/f1d10c82-106c-41b3-b14d-e30a95e76eb3.png';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- helpers ---------- */
function safeImg(src) { return src && src.trim() ? src : FALLBACK_IMAGE; }
function createElementFromHTML(html) { const div = document.createElement('div'); div.innerHTML = html.trim(); return div.firstChild; }
function extractIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal['strIngredient' + i];
    const measure = meal['strMeasure' + i];
    if (ing && ing.trim()) ingredients.push(`${measure ? measure.trim() : ''} ${ing.trim()}`.trim());
  }
  return ingredients;
}
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* ---------- panels ---------- */
const panels = ['panel-search','panel-categories','panel-area','panel-ingredients','panel-contact'];
function hideAllPanels(){
  panels.forEach(p => { const el = document.getElementById(p); if(el) el.classList.add('d-none'); });
  if($('#backFromCategoryMeals')) $('#backFromCategoryMeals').classList.add('d-none');
}

function showPanel(name){
  hideAllPanels();
  
  const el = document.getElementById(`panel-${name}`);
  if (el) el.classList.remove('d-none');

  if (name === "contact" || name === "categories") {
    document.getElementById("meals-container").style.display = "none";
    document.getElementById("meals-separator").style.display = "none";
  } else {
    document.getElementById("meals-container").style.display = "block";
    document.getElementById("meals-separator").style.display = "block";
  }

}

function initSidebarToggle() {
  const toggle = document.querySelector('.open-close-icon');
  const sidebar = document.getElementById('leftSidebar');
  const main = document.querySelector('.main-with-sidebar');

  if (!toggle || !sidebar || !main) return;

  const saved = localStorage.getItem('sidebar_collapsed');
  if (saved === 'true') {
    sidebar.classList.add('collapsed');
    main.classList.add('collapsed');
    toggle.setAttribute('aria-expanded', 'false');
  } else {
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.style.cursor = 'pointer';
  toggle.style.pointerEvents = 'auto';
  toggle.style.zIndex = '1060';

  toggle.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const isCollapsed = sidebar.classList.toggle('collapsed');
    main.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('collapsed')) {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        if (window.innerWidth >= 880) {
          sidebar.classList.add('collapsed');
          main.classList.add('collapsed');
          toggle.setAttribute('aria-expanded', 'false');
          localStorage.setItem('sidebar_collapsed', 'true');
        }
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        main.classList.add('collapsed');
        toggle.setAttribute('aria-expanded', 'false');
        localStorage.setItem('sidebar_collapsed', 'true');
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth < 880) {
      sidebar.classList.remove('collapsed');
      main.classList.remove('collapsed');
      localStorage.setItem('sidebar_collapsed', 'false');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
}

async function fetchInitialMeals() {
  try {
    const res = await fetch(API + 'search.php?s=');
    const data = await res.json();
    return data.meals ? data.meals.slice(0,24) : [];
  } catch (err) { console.error(err); return []; }
}

function renderGrid(meals) {
  const grid = $('#meals-grid');
  grid.innerHTML = '';
  if(!meals || meals.length === 0) {
    grid.innerHTML = `<div class="col-12"><p class="text-muted">No meals to show.</p></div>`;
    return;
  }
  meals.forEach(m => {
    const imgSrc = safeImg(m.strMealThumb);
    const cardHtml = `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="meal-card card-bg" data-id="${m.idMeal}" tabindex="0">
          <img src="${imgSrc}" alt="${escapeHtml(m.strMeal)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';">
          <div class="meal-overlay">
            <div class="meal-title">${escapeHtml(m.strMeal)}</div>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(createElementFromHTML(cardHtml));
  });
  $$('.meal-card').forEach(card => {
    card.addEventListener('click', () => showMealDetails(card.dataset.id));
    card.addEventListener('keydown', (e) => { if(e.key === 'Enter') showMealDetails(card.dataset.id); });
  });
}

async function loadCategories(){
  showPanel('categories');
  document.getElementById("meals-container").style.display = "block";
document.getElementById("meals-separator").style.display = "block";
  const res = await fetch(API + 'categories.php');
  const data = await res.json();
  const wrap = $('#categories-list');
  wrap.innerHTML = '';
  (data.categories || []).forEach(cat => {
    const col = document.createElement('div'); col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="card category-card" data-name="${escapeHtml(cat.strCategory)}" style="cursor:pointer;">
        <img src="${safeImg(cat.strCategoryThumb)}" class="card-img-top" style="height:140px; object-fit:cover;">
        <div class="card-body text-start">
          <h6 class="card-title mb-0">${escapeHtml(cat.strCategory)}</h6>
          <p class="small text-muted mt-1">${escapeHtml((cat.strCategoryDescription||'').slice(0,80))}...</p>
        </div>
      </div>
    `;
    wrap.appendChild(col);
  });

  $$('.category-card').forEach(c => {
    c.addEventListener('click', async () => {
      const categoryName = c.dataset.name;
      const backBtn = $('#backFromCategoryMeals'); if(backBtn) backBtn.classList.remove('d-none');
      if(backBtn) backBtn.onclick = async () => { backBtn.classList.add('d-none'); loadCategories(); };
      const res2 = await fetch(API + `filter.php?c=${encodeURIComponent(categoryName)}`);
      const dd = await res2.json();
      renderGrid(dd.meals ? dd.meals.slice(0,24) : []);
    });
  });
}

async function loadAreas(){
  showPanel('area');
  const res = await fetch(API + 'list.php?a=list');
  const data = await res.json();
  const wrap = $('#area-list'); wrap.innerHTML = '';
  (data.meals || []).slice(0,24).forEach(a => {
    const col = document.createElement('div'); col.className = 'col-6 col-md-3';
    col.innerHTML = `<button class="btn btn-outline-secondary w-100 area-btn" data-area="${escapeHtml(a.strArea)}">${escapeHtml(a.strArea)}</button>`;
    wrap.appendChild(col);
  });
  $$('.area-btn').forEach(b => b.addEventListener('click', async () => {
    const resp = await fetch(API + `filter.php?a=${encodeURIComponent(b.dataset.area)}`);
    const dd = await resp.json();
    renderGrid(dd.meals ? dd.meals.slice(0,24) : []);
  }));
}

async function loadIngredients(){
  showPanel('ingredients');
  const res = await fetch(API + 'list.php?i=list');
  const data = await res.json();
  const wrap = $('#ingredients-list'); wrap.innerHTML = '';
  (data.meals || []).slice(0,30).forEach(i => {
    const col = document.createElement('div'); col.className = 'col-6 col-md-3';
    col.innerHTML = `<button class="btn btn-outline-warning w-100 ingredient-btn text-truncate" data-ing="${escapeHtml(i.strIngredient)}">${escapeHtml(i.strIngredient)}</button>`;
    wrap.appendChild(col);
  });
  $$('.ingredient-btn').forEach(b => b.addEventListener('click', async () => {
    const resp = await fetch(API + `filter.php?i=${encodeURIComponent(b.dataset.ing)}`);
    const dd = await resp.json();
    renderGrid(dd.meals ? dd.meals.slice(0,24) : []);
  }));
}

async function showMealDetails(id) {
  try {
    const res = await fetch(API + `lookup.php?i=${id}`);
    const data = await res.json();
    if(!data || !data.meals) return;
    const m = data.meals[0];
    $('#mealTitle').textContent = m.strMeal || 'No title';
    $('#mealImage').src = safeImg(m.strMealThumb);
    $('#mealImage').alt = m.strMeal || 'meal image';
    $('#mealInstructions').textContent = m.strInstructions || 'No instructions available.';
    $('#mealArea').textContent = m.strArea || '-';
    $('#mealCategory').textContent = m.strCategory || '-';
    const ingrWrap = $('#mealIngredients'); ingrWrap.innerHTML = '';
    const ingredients = extractIngredients(m);
    if(ingredients.length === 0) ingrWrap.innerHTML = '<div class="small text-muted">No ingredients listed.</div>';
    else ingredients.forEach(it => { const span = document.createElement('span'); span.className = 'chip'; span.textContent = it; ingrWrap.appendChild(span); });
    const tagsWrap = $('#mealTags'); tagsWrap.innerHTML = '';
    if(m.strTags && m.strTags.trim()) m.strTags.split(',').map(t=>t.trim()).filter(Boolean).forEach(t => { const span = document.createElement('span'); span.className = 'tag'; span.textContent = t; tagsWrap.appendChild(span); } );
    else tagsWrap.innerHTML = '<div class="small text-muted">No tags</div>';
    const sourceBtn = $('#sourceBtn'); const ytBtn = $('#youtubeBtn');
    if(m.strSource && m.strSource.trim()) { sourceBtn.href = m.strSource; sourceBtn.style.display = 'inline-block'; } else sourceBtn.style.display = 'none';
    if(m.strYoutube && m.strYoutube.trim()) { ytBtn.href = m.strYoutube; ytBtn.style.display = 'inline-block'; } else ytBtn.style.display = 'none';
    const modalEl = document.getElementById('mealModal');
    const modal = new bootstrap.Modal(modalEl, { keyboard: true });
    modal.show();
  } catch(err) {
    console.error('Failed to load meal details', err);
    alert('Failed to load meal details.');
  }
}

const validators = {
  name: val => /^[A-Za-z\u0600-\u06FF ]{2,30}$/.test(val),
  email: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  phone: val => /^01[0-9]{9}$/.test(val),
  age: val => Number(val) >= 10 && Number(val) <= 99,
  password: val => /^(?=.{6,}$)(?=.*\d)(?=.*[A-Za-z]).+$/.test(val)
};
function checkContact(){
  let ok = true;
  Object.keys(validators).forEach(k => {
    const el = document.getElementById(k);
    if(!validators[k](el.value)) { el.classList.add('is-invalid'); el.classList.remove('is-valid'); ok = false; }
    else { el.classList.remove('is-invalid'); el.classList.add('is-valid'); }
  });
  $('#submit-contact').disabled = !ok;
}
['name','email','phone','age','password'].forEach(id => {
  const el = document.getElementById(id);
  if(el) el.addEventListener('input', checkContact);
});
if($('#contact-form')) $('#contact-form').addEventListener('submit', (e) => { e.preventDefault(); alert('Submitted (simulated)'); $('#contact-form').reset(); $('#submit-contact').disabled = true; $$('.is-valid').forEach(i=>i.classList.remove('is-valid')); });

/* ---------- sidebar links & search init ---------- */
function initSidebarLinks(){
  $$('.link-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.link-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const target = link.dataset.target;
      showPanel(target);
      if(target === 'categories') loadCategories();
      else if(target === 'area') loadAreas();
      else if(target === 'ingredients') loadIngredients();
    });
  });
}
function initSearchHandlers(){
  $('#btn-search').addEventListener('click', doSearch);
  $('#search-by-name').addEventListener('keyup', (e) => { if(e.key === 'Enter') doSearch(); });
 
}
async function doSearch(){
  const name = $('#search-by-name').value.trim();
  if(!name) { const initial = await fetchInitialMeals(); renderGrid(initial); return; }
  const res = await fetch(API + `search.php?s=${encodeURIComponent(name)}`);
  const data = await res.json();
  renderGrid(data.meals ? data.meals.slice(0,24) : []);
}

/* ---------- init on load ---------- */
window.addEventListener('load', async () => {
  initSidebarToggle();
  initSidebarLinks();
  initSearchHandlers();
  showPanel('search');
  const initial = await fetchInitialMeals();
  renderGrid(initial);
});
