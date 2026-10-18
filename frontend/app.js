/**
 * DataMind / Axiom Frontend Application Logic
 */

// Name Suggestions Data
const BRAND_SUGGESTIONS = [
  { name: 'DataMind', tag: 'Official PS1 Track Name' },
  { name: 'Axiom', tag: 'Mathematical Certainty' },
  { name: 'Vera', tag: 'From Veracity & Truth' },
  { name: 'Klaro', tag: 'Crystal Data Clarity' },
  { name: 'Synapse', tag: 'Neural Query Logic' }
];

// Sample Queries & Responses
const QUERY_PRESETS = {
  "What was total revenue in 1995?": {
    sql: "SELECT\n  SUM(l_extendedprice * (1 - l_discount)) AS total_revenue\nFROM lineitem\nWHERE l_shipdate >= '1995-01-01'\n  AND l_shipdate < '1996-01-01';",
    answer: "In 1995, the total net revenue across all shipped line items was $38,421,940.85.",
    queryId: "01b7f8c2-0001-382a-0003-889a0004e12a",
    table: {
      headers: ["Metric", "Year", "Net Revenue (USD)"],
      rows: [["Total Revenue", "1995", "$38,421,940.85"]]
    }
  },
  "Who are the top 3 customers by revenue?": {
    sql: "SELECT\n  c.c_name AS customer,\n  SUM(l.l_extendedprice * (1 - l.l_discount)) AS revenue\nFROM customer c\nJOIN orders o ON c.c_custkey = o.o_custkey\nJOIN lineitem l ON o.o_orderkey = l.l_orderkey\nGROUP BY c.c_name\nORDER BY revenue DESC\nLIMIT 3;",
    answer: "The top 3 customers are Customer#000000143 ($1,842,100), Customer#000000789 ($1,720,450), and Customer#000000312 ($1,690,200).",
    queryId: "01b7f8c2-0001-382a-0003-889a0004e14f",
    table: {
      headers: ["Rank", "Customer Identifier", "Total Spend"],
      rows: [
        ["1", "Customer#000000143", "$1,842,100.20"],
        ["2", "Customer#000000789", "$1,720,450.80"],
        ["3", "Customer#000000312", "$1,690,200.15"]
      ]
    }
  },
  "What is the average order discount in 1994?": {
    sql: "SELECT\n  AVG(l_discount) * 100 AS avg_discount_pct\nFROM lineitem\nWHERE l_shipdate >= '1994-01-01'\n  AND l_shipdate < '1995-01-01';",
    answer: "The average line-item discount applied in 1994 was 4.98%.",
    queryId: "01b7f8c2-0001-382a-0003-889a0004e19b",
    table: {
      headers: ["Year", "Average Discount (%)", "Sample Rows Examined"],
      rows: [["1994", "4.98%", "60,175 rows"]]
    }
  }
};

let currentBrand = 'DataMind';

function setBrandName(name) {
  if (!name || !name.trim()) return;
  currentBrand = name.trim();
  
  // Update all dynamic occurrences
  document.querySelectorAll('.dynamic-name').forEach(el => {
    el.textContent = currentBrand;
  });
  
  const logoEl = document.querySelector('.brand-logo-text');
  if (logoEl) logoEl.textContent = currentBrand;
  
  const descEl = document.getElementById('editorialDescText');
  if (descEl) {
    descEl.innerHTML = `<strong>${currentBrand}</strong> redefines data workflows, empowering you to query in natural language, verify every calculation, and extract insights faster—unlocking your <span class="highlight-orange">revenue potential</span>.`;
  }

  // Update active chip state
  document.querySelectorAll('.name-chip').forEach(chip => {
    if (chip.getAttribute('data-name').toLowerCase() === currentBrand.toLowerCase()) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

// Drawer Controls
function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer && backdrop) {
    drawer.classList.add('open');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeDrawers() {
  document.querySelectorAll('.slide-drawer').forEach(d => d.classList.remove('open'));
  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

// Query Execution Simulation
function executeQuery(questionText) {
  const input = document.getElementById('queryInput');
  const resultBox = document.getElementById('queryResultBox');
  const sqlEl = document.getElementById('resultSql');
  const answerEl = document.getElementById('resultAnswer');
  const queryIdEl = document.getElementById('resultQueryId');
  const tableEl = document.getElementById('resultTable');
  
  if (questionText) {
    input.value = questionText;
  }
  
  const q = input.value.trim();
  if (!q) return;

  const data = QUERY_PRESETS[q] || {
    sql: `SELECT\n  * \nFROM dataset_view\nWHERE filter_term ILIKE '%${q.replace(/'/g, '')}%'\nLIMIT 10;`,
    answer: `Analyzed grounded data for "${q}". Found relevant records matching your natural language query.`,
    queryId: "01b7f8c2-" + Math.random().toString(36).substring(2, 9),
    table: {
      headers: ["Query Term", "Verification Status", "Execution Engine"],
      rows: [[q, "Grounded & Verified", "Snowflake (read-only role)"]]
    }
  };

  // Render Result
  sqlEl.textContent = data.sql;
  answerEl.textContent = data.answer;
  queryIdEl.textContent = `Snowflake Query ID: ${data.queryId}`;
  
  // Build Table
  let tableHtml = '<thead><tr>';
  data.table.headers.forEach(h => {
    tableHtml += `<th>${h}</th>`;
  });
  tableHtml += '</tr></thead><tbody>';
  data.table.rows.forEach(r => {
    tableHtml += '<tr>';
    r.forEach(cell => {
      tableHtml += `<td>${cell}</td>`;
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody>';
  tableEl.innerHTML = tableHtml;

  resultBox.classList.add('visible');
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Initialize listeners
document.addEventListener('DOMContentLoaded', () => {
  // Name chips
  document.querySelectorAll('.name-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      setBrandName(chip.getAttribute('data-name'));
    });
  });

  const customInput = document.getElementById('customNameInput');
  if (customInput) {
    customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        setBrandName(customInput.value);
        customInput.blur();
      }
    });
  }

  // Drawers
  document.getElementById('btnAbilities')?.addEventListener('click', () => openDrawer('drawerAbilities'));
  document.getElementById('btnHowItWorks')?.addEventListener('click', () => openDrawer('drawerHowItWorks'));
  document.getElementById('btnStayConnected')?.addEventListener('click', () => openDrawer('drawerStayConnected'));
  document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawers);
  document.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', closeDrawers));

  // Query Ask
  document.getElementById('askBtn')?.addEventListener('click', () => executeQuery());
  document.getElementById('queryInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeQuery();
  });

  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      executeQuery(chip.textContent.trim());
    });
  });

  // Scroll button
  document.getElementById('btnScrollDown')?.addEventListener('click', () => {
    document.getElementById('queryStudioSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Set default
  setBrandName('DataMind');
});
