"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartProps {
  type: "line" | "bar" | "doughnut";
  data: any;
  options?: any;
  height?: number;
}

const TT = {
  backgroundColor: "#1c2530",
  borderColor: "#253040",
  borderWidth: 1,
  titleColor: "#e2eaf4",
  bodyColor: "#7a90a8",
  padding: 10,
};

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: TT,
  },
  scales: {
    x: {
      grid: {
        color: "rgba(48,60,80,.5)",
      },
      ticks: {
        color: "#4a6070",
        font: {
          size: 10,
        },
        maxRotation: 45,
        autoSkip: true,
      },
    },
    y: {
      grid: {
        color: "rgba(48,60,80,.5)",
      },
      ticks: {
        color: "#4a6070",
        font: {
          size: 10,
        },
      },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "62%",
  plugins: {
    legend: {
      display: false,
    },
    tooltip: TT,
  },
};

export default function ChartComponent({ type, data, options, height = 220 }: ChartProps) {
  const chartOptions = type === "doughnut" ? { ...doughnutOptions, ...options } : { ...baseOptions, ...options };

  return (
    <div style={{ height: `${height}px`, width: "100%", position: "relative" }}>
      {type === "line" && <Line data={data} options={chartOptions} />}
      {type === "bar" && <Bar data={data} options={chartOptions} />}
      {type === "doughnut" && <Doughnut data={data} options={chartOptions} />}
    </div>
  );
}
