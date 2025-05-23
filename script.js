const openButton = document.querySelector("#open-mobile-menu");
const closeButton = document.querySelector("#close-mobile-menu");
const background = document.querySelector(".backdrop");

const toggleMenu = (e) => {
  const menu = document.querySelector("#mobile-menu");
  menu.classList.toggle("hidden");
  menu.getAttribute("aria-hidden") === "true" ? menu.setAttribute("aria-hidden", "false") : menu.setAttribute("aria-hidden", "true");
};

openButton.addEventListener("click", toggleMenu);
closeButton.addEventListener("click", toggleMenu);
background.addEventListener("click", toggleMenu);

document.addEventListener("DOMContentLoaded", async function () {
  const response = await fetch("products.json");
  const data = await response.json();

  const desktopMenu = document.querySelector("#desktop-product-menu");
  const mobileMenu = document.querySelector("#mobile-product-menu"); // Fixed selector

  const desktopMenuItems = data.categories.map(createMenuSection);
  const mobileMenuItems = data.categories.map(createMenuSection);

  desktopMenu.append(...desktopMenuItems.flat(2));
  mobileMenu.append(...mobileMenuItems.flat(2));

  // set active class on first load
  const activeElement = window.location.hash.replace("#", "");
  if (!activeElement) return;

  // we have mobile-some-product-id and desktop-some-product-id
  // so we get all the ids by checking if they end with the product id
  const el = document.querySelector('li[id$="' + activeElement + '"]');

  desktopMenu.querySelector('[id$="' + activeElement + '"]')?.classList.toggle("bg-primary-300");
  mobileMenu.querySelector('[id$="' + activeElement + '"]')?.classList.toggle("bg-primary-300");
});

const createMenuHeading = (categoryName) => {
  if (!categoryName) {
    throw new Error("No Category Name Specified");
  }
  const li = document.createElement("li");
  li.className = "text-xs/6 font-semibold text-primary-50";
  li.innerText = categoryName;

  return li;
};

const createMenuSection = (category) => {
  const heading = createMenuHeading(category.name);
  const menuItems = category.products.map(createMenuItem);

  return [heading, ...menuItems];
};

const createMenuItemClass = (id) => {
  const deviceWidth = document.documentElement.clientWidth;
  // tailwindcss lg breakpoint is 1024px
  const prefix = deviceWidth < 1024 ? "mobile" : "desktop";

  return prefix + "-" + id;
};

const createMenuItem = (product) => {
  const li = document.createElement("li");
  li.className = "product-menu-item text-primary-50 hover:bg-primary-300 hover:text-white rounded-md cursor-pointer";
  li.id = createMenuItemClass(product.id);

  const a = document.createElement("a");
  a.className = "flex gap-x-3 p-2 text-sm/6 font-semibold text-primary-100";

  a.innerText = product.name;
  a.href = "#" + product.id;
  a.addEventListener("click", () => chartForProduct(product.id));

  li.append(a);

  return li;
};

window.addEventListener("hashchange", (e) => {
  const oldId = e.oldURL.split("#")[1];
  const newId = e.newURL.split("#")[1];

  document.querySelectorAll('[id$="' + oldId + '"]')?.forEach((el) => el.classList.toggle("bg-primary-300"));
  document.querySelectorAll('[id$="' + newId + '"]')?.forEach((el) => el.classList.toggle("bg-primary-300"));

  navigateTo(newId);
});

const navigateTo = (hash) => {
  const introPage = document.querySelector("#intro-page");
  const chartPage = document.querySelector("#chart-page");
  if (!introPage) return;

  if ("introduction" === hash) {
    introPage.classList.remove("hidden");
    chartPage.classList.add("hidden");
    return;
  }

  introPage.classList.add("hidden");
  chartPage.classList.remove("hidden");
  // we need this to refresh the chart on backwards/forward navigation
  chartForProduct(hash);
};

// Original code by Technative

function isNumeric(str) {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

const currentDate = new Date();

// Function to create date objects from YYYY-MM-DD strings
function createDateFromString(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
}

// Function to format date as YYYY-MM-DD
function formatDate(date) {
  if (!date) return "N/A";
  return date.toISOString().split("T")[0];
}

// Calculate support duration in days
function calculateSupportDuration(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  return (endDate - startDate) / (1000 * 60 * 60 * 24);
}

async function fetchProductReleases(product) {
  const response = await fetch(`https://endoflife.date/api/v1/products/${product}`);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const productData = await response.json();
  console.log(productData);

  // Process the data to match our format
  const releases = [];

  // Fetch detailed information for each cycle
  for (const cycle of productData.result.releases) {
    try {
      // Create a release object
      const release = {
        version: isNumeric(cycle.label) ? `${productData.result.label} ${cycle.label}` : cycle.label,
        release: createDateFromString(cycle.releaseDate),
        endOfSupport: cycle.eolFrom == null ? currentDate : createDateFromString(cycle.eolFrom),
        endOfExtendedSupport: createDateFromString(cycle.eoesFrom),
        lts: cycle.isLts,
      };

      releases.push(release);
    } catch (error) {
      console.error(`Error fetching details for ${product} ${cycle.name}:`, error);
    }
  }

  console.log(releases);

  // Filter out releases that are no longer supported
  const supportedReleases = releases.filter((release) => {
    // Keep releases where either standard support or extended support is still active
    return (release.endOfSupport && release.endOfSupport > currentDate) || (release.endOfExtendedSupport && release.endOfExtendedSupport > currentDate);
  });
  // Sort releases by release date (newest first)
  supportedReleases.sort((a, b) => b.release - a.release);

  return supportedReleases;
}

// Function to create the chart with the fetched data
async function createChart(product) {
  const productReleases = await fetchProductReleases(product);

  // Get current date for the vertical line
  const today = new Date();

  // Chart configuration
  const config = {
    type: "bar",
    data: {
      labels: productReleases.map((release) => release.version),
      datasets: [
        {
          label: "Standard Support",
          data: productReleases.map((release) => {
            return {
              x: [release.release, release.endOfSupport],
              y: release.version,
            };
          }),
          backgroundColor: productReleases.map((release) => (release.lts ? "rgba(233, 84, 32, 0.7)" : "rgba(119, 41, 83, 0.7)")),
          borderColor: productReleases.map((release) => (release.lts ? "rgba(233, 84, 32, 1)" : "rgba(119, 41, 83, 1)")),
          borderWidth: 1,
        },
        {
          label: "Extended Support (ESM)",
          data: productReleases
            .map((release) => {
              if (release.endOfExtendedSupport) {
                return {
                  x: [release.endOfSupport, release.endOfExtendedSupport],
                  y: release.version,
                };
              }
              return null;
            })
            .filter((item) => item !== null),
          backgroundColor: productReleases
            .map((release) => (release.lts ? "rgba(44, 130, 201, 0.7)" : "rgba(44, 130, 201, 0.7)"))
            .filter((_, i) => productReleases[i].endOfExtendedSupport !== null),
          borderColor: productReleases
            .map((release) => (release.lts ? "rgba(44, 130, 201, 1)" : "rgba(44, 130, 201, 1)"))
            .filter((_, i) => productReleases[i].endOfExtendedSupport !== null),
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y", // This makes the bar chart horizontal
      scales: {
        x: {
          type: "time",
          time: {
            unit: "year",
            displayFormats: {
              year: "yyyy",
            },
          },
          min: "2019-01-01",
          max: "2036-12-31",
          title: {
            display: true,
            text: "Support Timeline",
          },
        },
        y: {
          title: {
            display: true,
            text: `${product.capitalize()} Version`,
          },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500, // Default is 1000ms, so this makes it twice as fast
      },
      transitions: {
        active: {
          animation: {
            duration: 500, // Also make active state transitions faster
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            generateLabels: function (chart) {
              const datasets = chart.data.datasets;
              const legendItems = [
                {
                  text: "LTS Standard Support",
                  fillStyle: "rgba(233, 84, 32, 0.7)",
                  strokeStyle: "rgba(233, 84, 32, 1)",
                  lineWidth: 1,
                  hidden: !chart.isDatasetVisible(0),
                  datasetIndex: 0,
                },
                {
                  text: "Regular Release",
                  fillStyle: "rgba(119, 41, 83, 0.7)",
                  strokeStyle: "rgba(119, 41, 83, 1)",
                  lineWidth: 1,
                  hidden: !chart.isDatasetVisible(0),
                  datasetIndex: 0,
                },
                {
                  text: "Extended Security Maintenance (ESM)",
                  fillStyle: "rgba(44, 130, 201, 0.7)",
                  strokeStyle: "rgba(44, 130, 201, 1)",
                  lineWidth: 1,
                  hidden: !chart.isDatasetVisible(1),
                  datasetIndex: 1,
                },
                {
                  text: "Current Date",
                  fillStyle: "rgba(76, 175, 80, 1)",
                  strokeStyle: "rgba(76, 175, 80, 1)",
                  lineWidth: 3,
                  // This is just an indicator, not a toggleable dataset
                  hidden: false,
                  datasetIndex: -1,
                },
              ];
              return legendItems;
            },
          },
          onClick: function (e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            if (index < 0) return; // Skip for items that don't control datasets (like Current Date)

            const ci = legend.chart;
            if (ci.isDatasetVisible(index)) {
              ci.hide(index);
            } else {
              ci.show(index);
            }
            ci.update();
          },
        },
        annotation: {
          annotations: {
            currentDate: {
              type: "line",
              xMin: today,
              xMax: today,
              borderColor: "rgba(76, 175, 80, 1)",
              borderWidth: 3,
              label: {
                content: "Today",
                enabled: true,
                position: "top",
                backgroundColor: "rgba(76, 175, 80, 0.8)",
                color: "white",
                font: {
                  weight: "bold",
                },
              },
            },
          },
        },
        title: {
          display: true,
          text: `${product.capitalize()} Release Lifecycle`,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const datasetIndex = context.datasetIndex;
              const dataIndex = context.dataIndex;

              // For standard support
              if (datasetIndex === 0) {
                const release = productReleases[dataIndex];
                const duration = calculateSupportDuration(release.release, release.endOfSupport);
                const years = Math.floor(duration / 365);
                const months = Math.floor((duration % 365) / 30);

                return [
                  `Release: ${formatDate(release.release)}`,
                  `End of Standard Support: ${formatDate(release.endOfSupport)}`,
                  `Standard Support Duration: ${years} years, ${months} months`,
                  release.lts ? "Type: Long Term Support (LTS)" : "Type: Regular Release",
                ];
              }
              // For extended support
              else if (datasetIndex === 1) {
                // Find the corresponding release
                const filteredReleases = productReleases.filter((r) => r.endOfExtendedSupport !== null);
                const release = filteredReleases[dataIndex];

                const duration = calculateSupportDuration(release.endOfSupport, release.endOfExtendedSupport);
                const years = Math.floor(duration / 365);
                const months = Math.floor((duration % 365) / 30);

                return [
                  `Extended Support Start: ${formatDate(release.endOfSupport)}`,
                  `Extended Support End: ${formatDate(release.endOfExtendedSupport)}`,
                  `Extended Support Duration: ${years} years, ${months} months`,
                  `Version: ${release.version}`,
                ];
              }

              return [];
            },
          },
        },
      },
    },
  };

  // Return the chart configuration
  return config;
}
Object.defineProperty(String.prototype, "capitalize", {
  value: function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  enumerable: false,
});

async function chartForProduct(product) {
  // Show loading indicator
  const title = document.querySelector(".chart-title");
  const container = document.querySelector(".chart-container");
  title.innerHTML = `<div style="text-align: center; padding: 50px;">${product.capitalize()} Release Lifecycle Chart</div>`;
  container.innerHTML = `<div style="text-align: center; padding: 50px;">Loading ${product.capitalize()} release data...</div>`;

  try {
    const config = await createChart(product);

    // Clear loading indicator
    container.innerHTML = '<canvas id="horizontalBarChart"></canvas>';

    // Create the chart
    const ctx = document.getElementById("horizontalBarChart").getContext("2d");
    new Chart(ctx, config);
  } catch (error) {
    console.error("Error creating chart:", error);
    container.innerHTML = '<div style="text-align: center; padding: 50px; color: red;">Error loading data. Please try again later.</div>';
  }
}
