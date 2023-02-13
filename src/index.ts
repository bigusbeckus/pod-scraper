import { alphabet } from "./constants";
import { getLink, INTERVAL } from "./itunes";

alphabet.reverse();
const printLink = () =>
  alphabet.length > 0 && console.log(getLink(alphabet.pop() ?? "undefined"));

console.log("Start");
printLink();
setInterval(printLink, INTERVAL);
