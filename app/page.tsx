import ScatterPlot from '../components/ScatterPlot';

export default function Home() {
  const sampleData: [number[], number[]] = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [2.1, 3.5, 3.2, 5.8, 6.1, 4.9, 8.2, 7.5, 9.1, 8.8],
  ];

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-8">uPlot Scatter Plot Demo</h1>
      <ScatterPlot data={sampleData} />
    </div>
  );
}