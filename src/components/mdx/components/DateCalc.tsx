import { io } from "next/cache";
import { DateFormula } from "@/lib/date-formula";

interface DateCalcProps {
  formula: (d: DateFormula) => number;
}

export default async function DateCalc({ formula }: DateCalcProps) {
  await io();

  return <span>{formula(new DateFormula())}</span>;
}
