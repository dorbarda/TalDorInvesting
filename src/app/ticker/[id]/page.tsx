export default function TickerPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Ticker {params.id}</h1>
      <p className="text-muted-foreground mt-1">Detail page coming in step 5.</p>
    </div>
  );
}
