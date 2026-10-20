async function main() {
    let res = await fetch("http://localhost:5000/api/reservations");
    let data = await res.json();
    const resv33 = data.reservations.find(r => r.id === 33);
    console.log("Reservation 33 from /api/reservations:", JSON.stringify(resv33, null, 2));
}

main().catch(console.error);
