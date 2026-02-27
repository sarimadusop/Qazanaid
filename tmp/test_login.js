
async function test() {
  const data = { username: "smpusat", password: "any" };
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log("Status:", res.status);
    const body = await res.json();
    console.log("Response:", body);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
