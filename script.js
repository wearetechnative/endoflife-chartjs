// Data for the Ubuntu lifecycle chart
const currentDate = new Date();

// Function to create date objects from YYYY-MM-DD strings
function createDateFromString(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

// Function to format date as YYYY-MM-DD
function formatDate(date) {
    if (!date) return 'N/A';
    return date.toISOString().split('T')[0];
}

// Calculate support duration in days
function calculateSupportDuration(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    return (endDate - startDate) / (1000 * 60 * 60 * 24);
}

// Function to fetch Ubuntu release data from endoflife.date API
async function fetchUbuntuReleases() {
    try {
        const response = await fetch('https://endoflife.date/api/v1/products/ubuntu');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const ubuntuData = await response.json();

        // Process the data to match our format
        const releases = [];

        // Fetch detailed information for each cycle
        for (const cycle of ubuntuData.result.releases) {
            try {
                // Create a release object
                const release = {
                    version: `${cycle.label}`,
                    release: createDateFromString(cycle.releaseDate),
                    endOfSupport: createDateFromString(cycle.eolFrom),
                    endOfExtendedSupport: createDateFromString(cycle.eoesFrom),
                    lts: cycle.isLts
                };

                releases.push(release);
            } catch (error) {
                console.error(`Error fetching details for Ubuntu ${cycle.name}:`, error);
            }
        }

        // Filter out releases that are no longer supported
        const currentDate = new Date();
        const supportedReleases = releases.filter(release => {
            // Keep releases where either standard support or extended support is still active
            return (release.endOfSupport && release.endOfSupport > currentDate) || 
                   (release.endOfExtendedSupport && release.endOfExtendedSupport > currentDate);
        });
        // Sort releases by release date (newest first)
        supportedReleases.sort((a, b) => b.release - a.release);

        return supportedReleases;
    } catch (error) {
        console.error('Error fetching Ubuntu release data:', error);

        // Fallback to static data if API fails
        const staticReleases = [
            {
                version: '22.04 LTS (Jammy Jellyfish)',
                release: new Date(2022, 3, 21),
                endOfSupport: new Date(2027, 3, 21),
                endOfExtendedSupport: new Date(2032, 3, 21),
                lts: true
            },
            {
                version: '20.04 LTS (Focal Fossa)',
                release: new Date(2020, 3, 23),
                endOfSupport: new Date(2025, 3, 23),
                endOfExtendedSupport: new Date(2030, 3, 23),
                lts: true
            },
            {
                version: '23.10 (Mantic Minotaur)',
                release: new Date(2023, 9, 12),
                endOfSupport: new Date(2024, 6, 12),
                endOfExtendedSupport: null,
                lts: false
            },
            {
                version: '24.04 LTS (Noble Numbat)',
                release: new Date(2024, 3, 25),
                endOfSupport: new Date(2029, 3, 25),
                endOfExtendedSupport: new Date(2034, 3, 25),
                lts: true
            }
        ];

        // Filter out releases that are no longer supported
        const currentDate = new Date();
        const supportedStaticReleases = staticReleases.filter(release => {
            return (release.endOfSupport && release.endOfSupport > currentDate) || 
                   (release.endOfExtendedSupport && release.endOfExtendedSupport > currentDate);
        });

        return supportedStaticReleases;
    }
}

// Function to create the chart with the fetched data
async function createChart() {
    const ubuntuReleases = await fetchUbuntuReleases();
    
    // Get current date for the vertical line
    const today = new Date();
    
    // Chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: ubuntuReleases.map(release => release.version),
            datasets: [
                {
                    label: 'Standard Support',
                    data: ubuntuReleases.map(release => {
                        return {
                            x: [release.release, release.endOfSupport],
                            y: release.version
                        };
                    }),
                    backgroundColor: ubuntuReleases.map(release =>
                        release.lts ? 'rgba(233, 84, 32, 0.7)' : 'rgba(119, 41, 83, 0.7)'
                    ),
                    borderColor: ubuntuReleases.map(release =>
                        release.lts ? 'rgba(233, 84, 32, 1)' : 'rgba(119, 41, 83, 1)'
                    ),
                    borderWidth: 1
                },
                {
                    label: 'Extended Support (ESM)',
                    data: ubuntuReleases.map(release => {
                        if (release.endOfExtendedSupport) {
                            return {
                                x: [release.endOfSupport, release.endOfExtendedSupport],
                                y: release.version
                            };
                        }
                        return null;
                    }).filter(item => item !== null),
                    backgroundColor: ubuntuReleases.map(release =>
                        release.lts ? 'rgba(44, 130, 201, 0.7)' : 'rgba(44, 130, 201, 0.7)'
                    ).filter((_, i) => ubuntuReleases[i].endOfExtendedSupport !== null),
                    borderColor: ubuntuReleases.map(release =>
                        release.lts ? 'rgba(44, 130, 201, 1)' : 'rgba(44, 130, 201, 1)'
                    ).filter((_, i) => ubuntuReleases[i].endOfExtendedSupport !== null),
                    borderWidth: 1
                }
            ]
        },
    options: {
        indexAxis: 'y',  // This makes the bar chart horizontal
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'year',
                    displayFormats: {
                        year: 'yyyy'
                    }
                },
                min: '2019-01-01',
                max: '2036-12-31',
                title: {
                    display: true,
                    text: 'Support Timeline'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Ubuntu Version'
                }
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    generateLabels: function(chart) {
                        return [
                            {
                                text: 'LTS Standard Support',
                                fillStyle: 'rgba(233, 84, 32, 0.7)',
                                strokeStyle: 'rgba(233, 84, 32, 1)',
                                lineWidth: 1
                            },
                            {
                                text: 'Regular Release',
                                fillStyle: 'rgba(119, 41, 83, 0.7)',
                                strokeStyle: 'rgba(119, 41, 83, 1)',
                                lineWidth: 1
                            },
                            {
                                text: 'Extended Security Maintenance (ESM)',
                                fillStyle: 'rgba(44, 130, 201, 0.7)',
                                strokeStyle: 'rgba(44, 130, 201, 1)',
                                lineWidth: 1
                            },
                            {
                                text: 'Current Date',
                                fillStyle: 'rgba(76, 175, 80, 1)',
                                strokeStyle: 'rgba(76, 175, 80, 1)',
                                lineWidth: 3
                            }
                        ];
                    }
                }
            },
            annotation: {
                annotations: {
                    currentDate: {
                        type: 'line',
                        xMin: today,
                        xMax: today,
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 3,
                        label: {
                            content: 'Today',
                            enabled: true,
                            position: 'top',
                            backgroundColor: 'rgba(76, 175, 80, 0.8)',
                            color: 'white',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            },
            title: {
                display: true,
                text: 'Ubuntu Release Lifecycle'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const datasetIndex = context.datasetIndex;
                        const dataIndex = context.dataIndex;

                        // For standard support
                        if (datasetIndex === 0) {
                            const release = ubuntuReleases[dataIndex];
                            const duration = calculateSupportDuration(release.release, release.endOfSupport);
                            const years = Math.floor(duration / 365);
                            const months = Math.floor((duration % 365) / 30);

                            return [
                                `Release: ${formatDate(release.release)}`,
                                `End of Standard Support: ${formatDate(release.endOfSupport)}`,
                                `Standard Support Duration: ${years} years, ${months} months`,
                                release.lts ? 'Type: Long Term Support (LTS)' : 'Type: Regular Release'
                            ];
                        }
                        // For extended support
                        else if (datasetIndex === 1) {
                            // Find the corresponding release
                            const filteredReleases = ubuntuReleases.filter(r => r.endOfExtendedSupport !== null);
                            const release = filteredReleases[dataIndex];

                            const duration = calculateSupportDuration(release.endOfSupport, release.endOfExtendedSupport);
                            const years = Math.floor(duration / 365);
                            const months = Math.floor((duration % 365) / 30);

                            return [
                                `Extended Support Start: ${formatDate(release.endOfSupport)}`,
                                `Extended Support End: ${formatDate(release.endOfExtendedSupport)}`,
                                `Extended Support Duration: ${years} years, ${months} months`,
                                `Version: ${release.version}`
                            ];
                        }

                        return [];
                    }
                }
            }
        }
    }
};

    // Return the chart configuration
    return config;
}

// Create the chart when the page loads
window.onload = async function() {
    // Show loading indicator
    const container = document.querySelector('.chart-container');
    container.innerHTML = '<div style="text-align: center; padding: 50px;">Loading Ubuntu release data...</div>';

    try {
        const config = await createChart();

        // Clear loading indicator
        container.innerHTML = '<canvas id="horizontalBarChart"></canvas>';

        // Register the annotation plugin
        Chart.register(ChartAnnotation);

        // Create the chart
        const ctx = document.getElementById('horizontalBarChart').getContext('2d');
        new Chart(ctx, config);
    } catch (error) {
        console.error('Error creating chart:', error);
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: red;">Error loading data. Please try again later.</div>';
    }
};
