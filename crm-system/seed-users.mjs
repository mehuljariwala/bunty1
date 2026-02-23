const API_KEY = "AIzaSyBUp2ODHF6k2pVaYY26jY4cyLCbou5kxXg";

const USERS = [
  { name: "anuj", email: "anuj@gmail.com", password: "123456" },
  { name: "imran", email: "imran@gmail.com", password: "123456" },
  { name: "BHAGAT", email: "bhagat@gmail.com", password: "123456" },
  { name: "RADHE", email: "radhe@gmail.com", password: "123456" },
  { name: "PAPPA", email: "pappa@gmail.com", password: "PAPPA1" },
  { name: "sub_admin", email: "sub_admin@gmail.com", password: "sub_admin" },
];

async function createUser(user) {
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        returnSecureToken: true,
      }),
    }
  );

  const signUpData = await signUpRes.json();

  if (signUpData.error) {
    throw new Error(signUpData.error.message);
  }

  await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken: signUpData.idToken,
        displayName: user.name,
        returnSecureToken: false,
      }),
    }
  );

  return signUpData.localId;
}

async function main() {
  console.log("Seeding Firebase users...\n");

  for (const user of USERS) {
    try {
      const uid = await createUser(user);
      console.log(`  ✓ ${user.name} (${user.email}) — uid: ${uid}`);
    } catch (err) {
      console.log(`  ✗ ${user.name} (${user.email}) — ${err.message}`);
    }
  }

  console.log("\nDone!");
}

main();
