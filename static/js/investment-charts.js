/**
 * Enhanced Investment tab functionality with limited history support and benchmark comparison
 */
document.addEventListener('DOMContentLoaded', function() {
    // Setup investment tab initialization when tab is clicked
    document.getElementById('investment-tab').addEventListener('click', function() {
        initializeInvestmentTab();
    });

    // Also initialize if the URL hash is #investment
    if (window.location.hash === '#investment') {
        setTimeout(() => {
            document.getElementById('investment-tab').click();
        }, 100);
    }

    // Setup investment period quick filters
    setupInvestmentPeriodButtons();
    
    // Setup investment filter form
    setupInvestmentFilters();
    
    // Setup refresh prices button
    setupRefreshPricesButton();
});

/**
 * Initialize all components of the investment tab
 */
function initializeInvestmentTab() {
    // Initialize default dates for filters if they're empty
    initializeDefaultDates();
    
    // Initialize all investment charts
    initializePortfolioPerformanceChart();
    initializeAssetAllocationChart();
    initializeSectorDistributionChart();
    initializeInvestmentHistoryChart();
    
    // Check if we need to show no data message
    checkInvestmentData();
}

/**
 * Initialize default dates for investment filters
 */
function initializeDefaultDates() {
    const startDateInput = document.getElementById('investmentStartDate');
    const endDateInput = document.getElementById('investmentEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    // Only set if not already set
    if (!startDateInput.value) {
        // Default to 6 months ago
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDateInput.value = formatDate(sixMonthsAgo);
    }
    
    if (!endDateInput.value) {
        // Default to today
        const today = new Date();
        endDateInput.value = formatDate(today);
    }
}

/**
 * Format a date as YYYY-MM-DD for input fields
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Setup investment period quick filter buttons
 */
function setupInvestmentPeriodButtons() {
    document.querySelectorAll('.investment-period-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all period buttons
            document.querySelectorAll('.investment-period-btn').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-dark');
            });
            
            // Add active class to clicked button
            this.classList.remove('btn-dark');
            this.classList.add('btn-primary');
            
            // Set date range based on selected period
            const period = this.dataset.period;
            const endDate = new Date();
            let startDate = new Date();
            
            switch(period) {
                case '1month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case '3month':
                    startDate.setMonth(startDate.getMonth() - 3);
                    break;
                case '6month':
                    startDate.setMonth(startDate.getMonth() - 6);
                    break;
                case '1year':
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    break;
                case 'ytd':
                    startDate = new Date(endDate.getFullYear(), 0, 1); // January 1st of current year
                    break;
                case 'max':
                    // Set to 5 years ago or when the first investment was made
                    startDate.setFullYear(startDate.getFullYear() - 5);
                    break;
                default:
                    startDate.setMonth(startDate.getMonth() - 6);
            }
            
            // Update date inputs
            document.getElementById('investmentStartDate').value = formatDate(startDate);
            document.getElementById('investmentEndDate').value = formatDate(endDate);
            
            // Apply filters
            document.getElementById('applyInvestmentFilters').click();
        });
    });
}

/**
 * Setup investment filters form
 */
function setupInvestmentFilters() {
    const filterForm = document.getElementById('investmentFilterForm');
    const applyButton = document.getElementById('applyInvestmentFilters');
    
    if (!filterForm || !applyButton) return;
    
    // Add benchmark selection to the form
    addBenchmarkSelector(filterForm);
    
    applyButton.addEventListener('click', function() {
        // Get filter values
        const startDate = document.getElementById('investmentStartDate').value;
        const endDate = document.getElementById('investmentEndDate').value;
        const portfolioId = document.getElementById('portfolioFilter').value;
        const sector = document.getElementById('sectorFilter').value;
        const benchmark = document.getElementById('benchmarkSelector')?.value || 'none';
        
        // Apply filters by updating charts
        updateInvestmentCharts(startDate, endDate, portfolioId, sector, benchmark);
        
        // Persist filters in URL
        const url = new URL(window.location);
        url.hash = '#investment';
        url.searchParams.set('startDate', startDate);
        url.searchParams.set('endDate', endDate);
        url.searchParams.set('portfolioId', portfolioId);
        url.searchParams.set('sector', sector);
        url.searchParams.set('benchmark', benchmark);
        window.history.pushState({}, '', url);
    });
    
    // Apply filters from URL on load if present
    const url = new URL(window.location);
    if (url.hash === '#investment') {
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const portfolioId = url.searchParams.get('portfolioId');
        const sector = url.searchParams.get('sector');
        const benchmark = url.searchParams.get('benchmark');
        
        if (startDate) document.getElementById('investmentStartDate').value = startDate;
        if (endDate) document.getElementById('investmentEndDate').value = endDate;
        if (portfolioId) document.getElementById('portfolioFilter').value = portfolioId;
        if (sector) document.getElementById('sectorFilter').value = sector;
        if (benchmark && document.getElementById('benchmarkSelector')) 
            document.getElementById('benchmarkSelector').value = benchmark;
    }
}

/**
 * Add benchmark selector to filter form
 */
function addBenchmarkSelector(filterForm) {
    // Check if benchmark selector already exists
    if (document.getElementById('benchmarkSelector')) return;
    
    // Find a good position to add the benchmark selector (after sector filter)
    const sectorFilterGroup = document.getElementById('sectorFilter')?.closest('.mb-3');
    
    if (sectorFilterGroup) {
        // Create the benchmark selector
        const benchmarkGroup = document.createElement('div');
        benchmarkGroup.className = 'col-md-3 mb-3';
        benchmarkGroup.innerHTML = `
            <label class="form-label" style="color: #94a3b8;">
                <i class="fas fa-chart-line me-2" style="color: #f59e0b;"></i>Benchmark
            </label>
            <select class="form-select bg-dark text-light" id="benchmarkSelector" name="benchmark" style="border-color: #475569;">
                <option value="none">No Benchmark</option>
                <option value="sp500">S&P 500</option>
                <option value="nasdaq">NASDAQ Composite</option>
                <option value="djia">Dow Jones Industrial Avg</option>
                <option value="russell2000">Russell 2000</option>
            </select>
        `;
        
        // Insert after sector filter
        sectorFilterGroup.after(benchmarkGroup);
    }
}

/**
 * Update investment charts based on filter values
 */
function updateInvestmentCharts(startDate, endDate, portfolioId, sector, benchmark) {
    // Show loading indicators
    showLoadingState();
    
    // Simulate AJAX call with setTimeout
    setTimeout(() => {
        // Update charts with filtered data
        updatePortfolioPerformanceChart(portfolioId);
        updateAssetAllocationChart(portfolioId);
        updateSectorDistributionChart(sector);
        updateInvestmentHistoryChart(startDate, endDate, portfolioId, benchmark);
        
        // Hide loading indicators
        hideLoadingState();
    }, 800);
}

/**
 * Show loading state on all charts
 */
function showLoadingState() {
    document.querySelectorAll('.chart-container').forEach(container => {
        // Create loading overlay if it doesn't exist
        if (!container.querySelector('.chart-loading-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'chart-loading-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '10';
            
            const spinner = document.createElement('div');
            spinner.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: white;"></i>';
            
            overlay.appendChild(spinner);
            container.style.position = 'relative';
            container.appendChild(overlay);
        } else {
            container.querySelector('.chart-loading-overlay').style.display = 'flex';
        }
    });
}

/**
 * Hide loading state on all charts
 */
function hideLoadingState() {
    document.querySelectorAll('.chart-loading-overlay').forEach(overlay => {
        overlay.style.display = 'none';
    });
}

/**
 * Initialize Portfolio Performance Chart
 */
function initializePortfolioPerformanceChart() {
    const ctx = document.getElementById('portfolioPerformanceChart');
    if (!ctx) return;
    
    // Get portfolio data
    const portfolioData = getPortfolioData();
    
    if (portfolioData.length === 0) {
        showNoDataMessage('portfolioPerformanceCard', 'No portfolio performance data available');
        return;
    }
    
    // Sort portfolios by value (largest first)
    portfolioData.sort((a, b) => b.value - a.value);
    
    // Populate data arrays
    const portfolioNames = portfolioData.map(portfolio => portfolio.name);
    const currentValues = portfolioData.map(portfolio => portfolio.value);
    const costBases = portfolioData.map(portfolio => portfolio.value - portfolio.gainLoss);
    
    // Get currency symbol
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: portfolioNames,
            datasets: [{
                label: 'Current Value',
                data: currentValues,
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                borderWidth: 1
            }, {
                label: 'Cost Basis',
                data: costBases,
                backgroundColor: '#8b5cf6',
                borderColor: '#8b5cf6',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return currencySymbol + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += currencySymbol + context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Portfolio Performance Chart with filtered data
 */
function updatePortfolioPerformanceChart(portfolioId) {
    const chart = Chart.getChart('portfolioPerformanceChart');
    if (!chart) return;
    
    // Get portfolio data
    const portfolioData = getPortfolioData();
    
    // Filter by portfolio if needed
    let filteredData = portfolioData;
    if (portfolioId !== 'all') {
        filteredData = portfolioData.filter(p => p.id.toString() === portfolioId);
    }
    
    if (filteredData.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.data.datasets[1].data = [];
        chart.update();
        
        showNoDataMessage('portfolioPerformanceCard', 'No portfolio data matches the selected filters');
        return;
    } else {
        hideNoDataMessage('portfolioPerformanceCard');
    }
    
    // Sort portfolios by value (largest first)
    filteredData.sort((a, b) => b.value - a.value);
    
    // Update chart data
    chart.data.labels = filteredData.map(p => p.name);
    chart.data.datasets[0].data = filteredData.map(p => p.value);
    chart.data.datasets[1].data = filteredData.map(p => p.value - p.gainLoss);
    
    chart.update();
}

/**
 * Initialize Asset Allocation Chart
 */
function initializeAssetAllocationChart() {
    const ctx = document.getElementById('assetAllocationChart');
    if (!ctx) return;
    
    // Get portfolio data
    const portfolioData = getPortfolioData();
    
    if (portfolioData.length === 0) {
        showNoDataMessage('assetAllocationCard', 'No asset allocation data available');
        return;
    }
    
    // Prepare data for chart
    const labels = portfolioData.map(p => p.name);
    const values = portfolioData.map(p => p.value);
    const colors = [
        '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
        '#8b5cf6', '#6b7280', '#ef4444', '#0ea5e9', '#f97316'
    ];
    
    // Get currency symbol
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    
    // Calculate total value for percentage calculation
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, values.length),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#e5e7eb'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = currencySymbol + context.parsed.toLocaleString();
                            const percentage = ((context.parsed / totalValue) * 100).toFixed(1) + '%';
                            return label + ': ' + value + ' (' + percentage + ')';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Asset Allocation Chart with filtered data
 */
function updateAssetAllocationChart(portfolioId) {
    const chart = Chart.getChart('assetAllocationChart');
    if (!chart) return;
    
    // Get portfolio data
    const portfolioData = getPortfolioData();
    
    // Filter by portfolio if needed
    let filteredData = portfolioData;
    if (portfolioId !== 'all') {
        filteredData = portfolioData.filter(p => p.id.toString() === portfolioId);
    }
    
    if (filteredData.length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        
        showNoDataMessage('assetAllocationCard', 'No asset allocation data matches the selected filters');
        return;
    } else {
        hideNoDataMessage('assetAllocationCard');
    }
    
    // Update chart data
    chart.data.labels = filteredData.map(p => p.name);
    chart.data.datasets[0].data = filteredData.map(p => p.value);
    
    // Calculate new total for percentage calculation
    const totalValue = filteredData.reduce((sum, p) => sum + p.value, 0);
    
    // Update tooltip callback
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        const label = context.label || '';
        const value = currencySymbol + context.parsed.toLocaleString();
        const percentage = ((context.parsed / totalValue) * 100).toFixed(1) + '%';
        return label + ': ' + value + ' (' + percentage + ')';
    };
    
    chart.update();
}

/**
 * Initialize Sector Distribution Chart
 */
function initializeSectorDistributionChart() {
    const ctx = document.getElementById('sectorDistributionChart');
    if (!ctx) return;
    
    // Get sector data
    const sectorData = getSectorData();
    
    if (Object.keys(sectorData).length === 0) {
        showNoDataMessage('sectorDistributionCard', 'No sector distribution data available');
        return;
    }
    
    // Prepare data for chart
    const labels = Object.keys(sectorData);
    const values = Object.values(sectorData);
    const colors = [
        '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
        '#8b5cf6', '#6b7280', '#ef4444', '#0ea5e9', '#f97316'
    ];
    
    // Get currency symbol
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    
    // Calculate total value for percentage calculation
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, values.length),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = currencySymbol + context.parsed.toLocaleString();
                            const percentage = ((context.parsed / totalValue) * 100).toFixed(1) + '%';
                            return label + ': ' + value + ' (' + percentage + ')';
                        }
                    }
                }
            }
        }
    });
    
    // Update the legend container
    updateSectorLegend(labels, values, colors, totalValue);
}

/**
 * Update Sector Distribution Chart with filtered data
 */
function updateSectorDistributionChart(sectorFilter) {
    const chart = Chart.getChart('sectorDistributionChart');
    if (!chart) return;
    
    // Get sector data
    let sectorData = getSectorData();
    
    // Filter by sector if needed
    if (sectorFilter !== 'all') {
        const filteredData = {};
        if (sectorFilter in sectorData) {
            filteredData[sectorFilter] = sectorData[sectorFilter];
            sectorData = filteredData;
        }
    }
    
    if (Object.keys(sectorData).length === 0) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        
        showNoDataMessage('sectorDistributionCard', 'No sector data matches the selected filters');
        return;
    } else {
        hideNoDataMessage('sectorDistributionCard');
    }
    
    // Update chart data
    const labels = Object.keys(sectorData);
    const values = Object.values(sectorData);
    const colors = [
        '#10b981', '#3b82f6', '#f59e0b', '#ec4899', 
        '#8b5cf6', '#6b7280', '#ef4444', '#0ea5e9', '#f97316'
    ];
    
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = colors.slice(0, values.length);
    
    // Calculate new total for percentage calculation
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    
    // Update tooltip callback
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        const label = context.label || '';
        const value = currencySymbol + context.parsed.toLocaleString();
        const percentage = ((context.parsed / totalValue) * 100).toFixed(1) + '%';
        return label + ': ' + value + ' (' + percentage + ')';
    };
    
    chart.update();
    
    // Update the legend container
    updateSectorLegend(labels, values, colors, totalValue);
}

/**
 * Update sector legend with current data
 */
function updateSectorLegend(labels, values, colors, totalValue) {
    const legendContainer = document.querySelector('.legend-container');
    if (!legendContainer) return;
    
    // Clear existing legend
    legendContainer.innerHTML = '';
    
    // Create row container
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    
    // Get currency symbol
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    
    // Add legend items
    if (labels.length === 0) {
        const col = document.createElement('div');
        col.className = 'col-12 text-center';
        col.innerHTML = '<em>No sector data available</em>';
        rowDiv.appendChild(col);
    } else {
        labels.forEach((label, index) => {
            const value = values[index];
            const color = colors[index % colors.length];
            const percentage = ((value / totalValue) * 100).toFixed(1);
            
            const col = document.createElement('div');
            col.className = 'col-md-6 mb-2';
            
            col.innerHTML = `
                <div class="d-flex align-items-center">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 8px;"></div>
                    <div>${label}</div>
                    <div class="ms-auto">${percentage}%</div>
                </div>
            `;
            
            rowDiv.appendChild(col);
        });
    }
    
    legendContainer.appendChild(rowDiv);
}

/**
 * Initialize Investment History Chart with support for limited history and benchmark comparison
 */
function initializeInvestmentHistoryChart() {
    const ctx = document.getElementById('investmentHistoryChart');
    if (!ctx) return;
    
    // Get the total investment value
    const totalInvestmentsElem = document.getElementById('totalInvestments');
    if (!totalInvestmentsElem) {
        showNoDataMessage('investmentHistoryCard', 'Investment total element not found');
        return;
    }
    
    const totalInvestmentValue = parseFloat(totalInvestmentsElem.innerText.replace(/[^0-9.-]+/g, ''));
    if (isNaN(totalInvestmentValue) || totalInvestmentValue <= 0) {
        showNoDataMessage('investmentHistoryCard', 'No investment value available');
        return;
    }
    
    // Get history data from DOM if available
    let historyData = getInvestmentHistoryData();
    
    // If no history data is available, create limited history with current data
    if (historyData.labels.length === 0 || historyData.values.length === 0) {
        historyData = createLimitedHistoryData(totalInvestmentValue);
    }
    
    // Get currency symbol
    const currencySymbol = document.getElementById('dashboard-container').dataset.currency || '$';
    
    // Create chart
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [{
                label: 'Portfolio Value',
                data: historyData.values,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                order: 1 // Make portfolio the primary dataset
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return currencySymbol + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            
                            // Handle percentage datasets (benchmarks)
                            if (context.dataset.isPercentage) {
                                return label + context.parsed.y.toFixed(2) + '%';
                            }
                            
                            // Regular value datasets
                            if (context.parsed.y !== null) {
                                return label + currencySymbol + context.parsed.y.toLocaleString();
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update Investment History Chart with filtered data and benchmark comparison
 */
function updateInvestmentHistoryChart(startDate, endDate, portfolioId, benchmark) {
    const chart = Chart.getChart('investmentHistoryChart');
    if (!chart) return;
    
    // Get the total investment value
    const totalInvestmentsElem = document.getElementById('totalInvestments');
    if (!totalInvestmentsElem) {
        showNoDataMessage('investmentHistoryCard', 'Investment total element not found');
        return;
    }
    
    const totalInvestmentValue = parseFloat(totalInvestmentsElem.innerText.replace(/[^0-9.-]+/g, ''));
    if (isNaN(totalInvestmentValue) || totalInvestmentValue <= 0) {
        showNoDataMessage('investmentHistoryCard', 'No investment value available');
        return;
    }
    
    // Get filtered history data - in a real app, this would come from an API
    // For this demo, we'll create limited data based on the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Get or create limited history data
    const historyData = createLimitedHistoryData(totalInvestmentValue, start, end, portfolioId);
    
    // Update chart with portfolio data
    chart.data.labels = historyData.labels;
    chart.data.datasets = [{
        label: 'Portfolio Value',
        data: historyData.values,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        order: 1 // Make portfolio the primary dataset
    }];
    
    // Add benchmark if selected
    if (benchmark && benchmark !== 'none') {
        addBenchmarkToChart(chart, benchmark, historyData.labels);
    }
    
    // Show chart and hide no data message
    hideNoDataMessage('investmentHistoryCard');
    chart.update();
}

/**
 * Create limited history data based on current investment value
 * This creates a realistic growth curve for the limited data we have
 */
function createLimitedHistoryData(currentValue, startDate, endDate, portfolioId) {
    // Default date range if not provided (last 90 days)
    if (!startDate) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
    }
    if (!endDate) {
        endDate = new Date();
    }
    
    // Calculate number of data points (one per week)
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const numWeeks = Math.max(2, Math.ceil(diffDays / 7)); // At least 2 data points
    
    const labels = [];
    const values = [];
    
    // Get portfolio data for filtering
    const portfolios = getPortfolioData();
    let selectedPortfolioValue = currentValue;
    
    // If portfolio selected, use its value instead of total
    if (portfolioId && portfolioId !== 'all') {
        const selectedPortfolio = portfolios.find(p => p.id.toString() === portfolioId);
        if (selectedPortfolio) {
            selectedPortfolioValue = selectedPortfolio.value;
        }
    }
    
    // Estimate a reasonable starting value (5-10% less than current)
    // This creates a conservative growth curve for display purposes
    const estimatedStartValue = selectedPortfolioValue * (1 - (Math.random() * 0.05 + 0.05));
    
    // Generate data points
    for (let i = 0; i < numWeeks; i++) {
        // Calculate date for this point
        const pointDate = new Date(startDate);
        pointDate.setDate(startDate.getDate() + Math.round(i * (diffDays / (numWeeks - 1))));
        
        // Format date label
        const dateLabel = pointDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        labels.push(dateLabel);
        
        // Calculate value with smooth progression from start to current
        const progress = i / (numWeeks - 1);
        let value = estimatedStartValue + (selectedPortfolioValue - estimatedStartValue) * progress;
        
        // Add slight randomness for realistic movement
        const randomFactor = 0.99 + (Math.random() * 0.02); // ±1% randomness
        value *= randomFactor;
        
        values.push(value);
    }
    
    // Ensure the last value is exactly the current value
    if (values.length > 0) {
        values[values.length - 1] = selectedPortfolioValue;
    }
    
    return {
        labels: labels,
        values: values
    };
}

/**
 * Add benchmark data to the history chart
 */
function addBenchmarkToChart(chart, benchmarkType, dateLabels) {
    // Define benchmark colors and styles
    const benchmarkStyles = {
        'sp500': { color: '#f97316', label: 'S&P 500' },
        'nasdaq': { color: '#3b82f6', label: 'NASDAQ' },
        'djia': { color: '#a855f7', label: 'Dow Jones' },
        'russell2000': { color: '#ec4899', label: 'Russell 2000' }
    };
    
    if (!benchmarkStyles[benchmarkType]) return;
    
    // Get style for selected benchmark
    const style = benchmarkStyles[benchmarkType];
    
    // Generate benchmark data - in a real app this would come from an API
    // Here we simulate a reasonable market benchmark for the timeframe
    const benchmarkData = generateBenchmarkData(benchmarkType, dateLabels.length);
    
    // Add benchmark dataset to chart
    chart.data.datasets.push({
        label: style.label,
        data: benchmarkData,
        backgroundColor: 'transparent',
        borderColor: style.color,
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        order: 2, // Make benchmark secondary
        yAxisID: 'percentage',
        isPercentage: true // Flag to indicate percentage values for tooltips
    });
    
    // Add percentage y-axis if it doesn't exist
    if (!chart.options.scales.percentage) {
        chart.options.scales.percentage = {
            position: 'right',
            grid: { 
                drawOnChartArea: false
            },
            ticks: {
                callback: function(value) {
                    return value + '%';
                }
            },
            title: {
                display: true,
                text: 'Performance (%)'
            }
        };
    }
    
    chart.update();
}

/**
 * Generate simulated benchmark data
 * This creates realistic-looking benchmark data for demonstration
 */
function generateBenchmarkData(benchmarkType, numPoints) {
    // Define benchmark characteristics
    const benchmarkTraits = {
        'sp500': { volatility: 0.5, trend: 0.2 }, // More stable, moderate growth
        'nasdaq': { volatility: 0.8, trend: 0.3 }, // Higher volatility, higher growth
        'djia': { volatility: 0.4, trend: 0.15 }, // Most stable, slower growth
        'russell2000': { volatility: 0.9, trend: 0.25 } // Most volatile, good growth
    };
    
    const traits = benchmarkTraits[benchmarkType] || { volatility: 0.6, trend: 0.2 };
    
    // Create percentage change values starting from 0%
    const data = [0]; // First point is baseline (0% change)
    
    // Generate realistic movement
    for (let i = 1; i < numPoints; i++) {
        // Random walk with trend and volatility
        const randomFactor = (Math.random() * 2 - 1) * traits.volatility; // ±volatility%
        const trendFactor = traits.trend * (i / numPoints); // Gradual trend influence
        const previousValue = data[i-1];
        
        // Calculate new value with both random and trend components
        const newValue = previousValue + randomFactor + trendFactor;
        data.push(parseFloat(newValue.toFixed(2)));
    }
    
    return data;
}

/**
 * Get investment history data from DOM if available
 */
function getInvestmentHistoryData() {
    // Initialize empty data structure
    const historyData = {
        labels: [],
        values: []
    };
    
    // Try to find data in DOM
    const container = document.getElementById('dashboard-container');
    
    if (container && container.dataset.investmentHistory) {
        try {
            const parsedData = JSON.parse(container.dataset.investmentHistory);
            
            if (parsedData.labels && parsedData.values && 
                Array.isArray(parsedData.labels) && Array.isArray(parsedData.values) &&
                parsedData.labels.length > 0 && parsedData.values.length > 0) {
                
                historyData.labels = parsedData.labels;
                historyData.values = parsedData.values;
            }
        } catch (e) {
            console.error('Error parsing investment history data:', e);
        }
    }
    
    return historyData;
}

/**
 * Setup the refresh prices button
 */
function setupRefreshPricesButton() {
    const refreshBtn = document.getElementById('refreshInvestmentsBtn');
    if (!refreshBtn) return;
    
    refreshBtn.addEventListener('click', function() {
        // Show loading state
        this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Updating...';
        this.disabled = true;
        
        // Make AJAX request
        fetch('/update_prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success toast
                showToast('Success', data.message, 'success');
                
                // Reload page after short delay
                setTimeout(() => location.reload(), 1500);
            } else {
                // Show error toast
                showToast('Error', data.message || 'Failed to update prices', 'danger');
                
                // Reset button
                this.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Refresh Prices';
                this.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Show error toast
            showToast('Error', 'An error occurred while updating prices', 'danger');
            
            // Reset button
            this.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Refresh Prices';
            this.disabled = false;
        });
    });
}

/**
 * Helper function to show a toast notification
 */
function showToast(title, message, type) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast HTML
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
            <div class="toast-header ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(document.getElementById(toastId));
    toast.show();
    
    // Remove toast from DOM after it's hidden
    document.getElementById(toastId).addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

/**
 * Check if there's investment data available
 */
function checkInvestmentData() {
    // Check for investment data in DOM based on total investment value
    const totalInvestmentsElem = document.getElementById('totalInvestments');
    const hasInvestments = totalInvestmentsElem && 
                          parseFloat(totalInvestmentsElem.innerText.replace(/[^0-9.-]+/g, '')) > 0;
    
    // Check for portfolio data
    const hasPortfolios = getPortfolioData().length > 0;
    
    // Check for sector data
    const hasSectors = Object.keys(getSectorData()).length > 0;
    
    if (!hasInvestments && !hasPortfolios && !hasSectors) {
        document.querySelectorAll('#investment .card').forEach(card => {
            card.style.display = 'none';
        });
        
        // Show a message about no investment data
        const tab = document.getElementById('investment');
        
        // Check if message already exists
        if (!tab.querySelector('.no-investment-data')) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'alert alert-info no-investment-data';
            messageDiv.innerHTML = `
                <i class="fas fa-info-circle me-2"></i>
                <span>You don't have any investment data yet. <a href="${document.querySelector('a[href*="portfolios"]').getAttribute('href')}" class="alert-link">Create your first investment portfolio</a> to get started.</span>
            `;
            
            // Add before the first card in the tab
            if (tab.querySelector('.card')) {
                tab.insertBefore(messageDiv, tab.querySelector('.card'));
            } else {
                tab.appendChild(messageDiv);
            }
        }
    } else {
        // Show all cards
        document.querySelectorAll('#investment .card').forEach(card => {
            card.style.display = '';
        });
        
        // Remove the no data message if it exists
        const noDataMessage = document.querySelector('#investment .no-investment-data');
        if (noDataMessage) {
            noDataMessage.remove();
        }
    }
}

/**
 * Show a "no data" message in a card
 */
function showNoDataMessage(cardId, message) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Check if message already exists
    const existingMessage = card.querySelector('.no-data-message');
    if (existingMessage) {
        existingMessage.textContent = message;
        existingMessage.style.display = 'block';
        return;
    }
    
    // Create message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'no-data-message alert alert-info my-3';
    messageDiv.textContent = message;
    
    // Find chart container and hide it
    const chartContainer = card.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.style.display = 'none';
    }
    
    // Add message after chart container
    const cardBody = card.querySelector('.card-body');
    if (cardBody) {
        cardBody.appendChild(messageDiv);
    }
}

/**
 * Hide a "no data" message in a card
 */
function hideNoDataMessage(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Find message and hide it
    const message = card.querySelector('.no-data-message');
    if (message) {
        message.style.display = 'none';
    }
    
    // Show chart container
    const chartContainer = card.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
}

/**
 * Helper function to get portfolio data from HTML
 * Returns empty array if no data found instead of generating fake data
 */
function getPortfolioData() {
    // Get data from the DOM
    const portfolioData = [];
    
    // Try to find data in the DOM
    document.querySelectorAll('#investment .table tbody tr').forEach(row => {
        // Skip the "no portfolios" row
        if (row.querySelector('td[colspan]')) return;
        
        // Get portfolio data from the table
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const name = cells[0].textContent.trim();
            const valueText = cells[1].textContent.trim();
            const gainLossText = cells[2].textContent.trim();
            
            // Extract ID from the link
            const link = cells[0].querySelector('a');
            const id = link ? link.href.split('/').pop() : Math.random().toString().substr(2, 5);
            
            // Clean up currency and convert to numbers
            const value = parseFloat(valueText.replace(/[^0-9.-]+/g, '')) || 0;
            const gainLoss = parseFloat(gainLossText.replace(/[^0-9.-]+/g, '')) * (gainLossText.includes('down') ? -1 : 1) || 0;
            
            portfolioData.push({
                id: id,
                name: name,
                value: value,
                gainLoss: gainLoss
            });
        }
    });
    
    // Try to get data from data attribute if no DOM data found
    if (portfolioData.length === 0) {
        try {
            const portfolioDataElement = document.querySelector('[data-portfolio-data]');
            if (portfolioDataElement) {
                const data = JSON.parse(portfolioDataElement.dataset.portfolioData);
                return data;
            }
        } catch (e) {
            console.error('Error parsing portfolio data:', e);
        }
    }
    
    return portfolioData;
}

/**
 * Helper function to get sector data from HTML
 * Returns empty object if no data found instead of generating fake data
 */
function getSectorData() {
    // Get data from the DOM
    const sectorData = {};
    
    // Try to find data in the DOM
    document.querySelectorAll('.legend-container .row > div').forEach(legendItem => {
        // Skip the "no data" message
        if (legendItem.classList.contains('text-center')) return;
        
        // Get sector and percentage
        const sectorName = legendItem.textContent.trim().split('%')[0].trim();
        if (!sectorName) return;
        
        // Extract sector name and value
        const nameParts = sectorName.split(/\s+/);
        if (nameParts.length > 1) {
            const percentage = parseFloat(nameParts.pop());
            const name = nameParts.join(' ');
            
            // Get the total value from the DOM
            const totalValue = parseFloat(document.getElementById('totalInvestments').textContent.replace(/[^0-9.-]+/g, '')) || 0;
            
            // Calculate value based on percentage
            const value = (percentage / 100) * totalValue;
            
            sectorData[name] = value;
        }
    });
    
    // If no data found in DOM, check for data attributes
    if (Object.keys(sectorData).length === 0) {
        try {
            const container = document.getElementById('dashboard-container');
            if (container) {
                const sectorLabels = JSON.parse(container.dataset.sectorLabels || '[]');
                const sectorValues = JSON.parse(container.dataset.sectorValues || '[]');
                
                sectorLabels.forEach((label, index) => {
                    if (label && sectorValues[index]) {
                        sectorData[label] = sectorValues[index];
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing sector data:', e);
        }
    }
    
    return sectorData;
}

/**
 * Apply visual styles to the investment tab elements
 */
function applyInvestmentTabStyles() {
    // Style the active filter period button
    document.querySelector('.investment-period-btn[data-period="6month"]')?.classList.add('btn-primary');
    document.querySelector('.investment-period-btn[data-period="6month"]')?.classList.remove('btn-dark');
    
    // Add hover effects to cards
    document.querySelectorAll('#investment .card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });
    
    // Add hover effects to refresh button
    const refreshBtn = document.getElementById('refreshInvestmentsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
        });
        
        refreshBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        });
    }
}