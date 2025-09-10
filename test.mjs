import { convertUnixToHHMM, createClient } from "./plugin/src/Hoppie.mjs";


const c = createClient("2G2xT66pfNKUgzDXs", "DBUZZ", "C25C", message => {
  console.log(message);
});

const res = await c.sendPdc("EDDF", "EKCH", "EDDF", "A22", "K", convertUnixToHHMM(Date.now()), "teeest")
console.log(res)