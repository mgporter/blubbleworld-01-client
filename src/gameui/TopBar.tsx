import { C } from "../Constants";
import { useStore } from "./Store"

interface TopBarProps {
  children: React.ReactNode;
}

const UiProps = "bg-slate-800/50 pointer-events-auto rounded-2xl py-1 px-4 ";


export default function TopBar({children}: TopBarProps) {

  const people = useStore((state) => state.people);
  const money = useStore((state) => state.money);

  const populationGoalMet = people >= C.populationGoal;
  const outOfMoney = money === 0;
  const lowMoney = money <= 50 && money != 0;

  return (
    <div className='topbar grow-0 h-10 m-2 flex gap-4 justify-end items-start text-white'>
      <div className={UiProps + "select-none rounded-3xl flex items-center " + 
        (populationGoalMet ? " text-white bg-green-700/50" : "")}>
        <p>Population: {people} / {C.populationGoal}</p>
      </div>
      <div className={UiProps + "select-none rounded-3xl flex items-center " +
        (lowMoney ? "text-orange-400 " : "") + (outOfMoney ? "text-red-500 " : "")}>
        <p>Money: {money}</p>
      </div>
      {children}
    </div>
  )
}