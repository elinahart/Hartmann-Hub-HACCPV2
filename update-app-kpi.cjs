const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Dashboard logic extraction to App component
const dashboardKpiLogic = `
  const [kpiData, setKpiData] = useState({ 
    tasksDone: 0, 
    tasksRemaining: 3, 
    lastTemp: '-', 
    lastAction: '-' 
  });

  const calculateProgress = () => {
    const now = new Date();
    const interval = { start: startOfDay(now), end: endOfDay(now) };
    
    // Check daily tasks
    const temps = getStoredData<any[]>('crousty_temp_checklist', []);
    const cleaning = getStoredData<any[]>('crousty_cleaning', []);
    const oil = getStoredData<any[]>('crousty_oil_checklist', []);
    
    const tempsToday = temps.some(t => isWithinInterval(new Date(t.date), interval));
    const cleaningToday = cleaning.some(c => isWithinInterval(new Date(c.date), interval));
    const oilToday = oil.some(o => isWithinInterval(new Date(o.date), interval));
    
    let score = 0;
    let done = 0;
    if (tempsToday) { score += 33; done++; }
    if (cleaningToday) { score += 33; done++; }
    if (oilToday) { score += 34; done++; }
    
    // Get last temperature recorded
    const lastTempEntry = temps.length > 0 ? temps[0] : null;
    let lastTempStr = '-';
    if (lastTempEntry && lastTempEntry.equipments) {
      // Find first non-empty temp
      const firstValid = Object.values(lastTempEntry.equipments).find(t => t !== '');
      if (firstValid) lastTempStr = \`\${firstValid}°C\`;
    }

    setDailyProgress(score);
    setAlerts({
      temps: !tempsToday,
      cleaning: !cleaningToday,
      oil: !oilToday
    });
    setKpiData({
      tasksDone: done,
      tasksRemaining: 3 - done,
      lastTemp: lastTempStr,
      lastAction: dateToTimeAgo(temps.length ? temps[0].date : null)
    });
  };

  const dateToTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const diffMs = new Date().getTime() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return \`Il y a \${diffMins} min\`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return \`Il y a \${diffHrs}h\`;
    return 'Plus de 24h';
  };
`;

content = content.replace(/const calculateProgress = \(\) => {[\s\S]*?oil: !oilToday\n    }\);\n  };/, dashboardKpiLogic);

const newKpiUI = `
          {/* Progress Ring and KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-4">
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex items-center gap-6">
              <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#E2E8F0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#c2f000" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * dailyProgress) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-4xl font-black text-gray-800 tracking-tighter">{dailyProgress}%</span>
                  <span className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-widest mt-1">Journée</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <span className="text-xs text-green-600 font-bold uppercase block mb-1">Tâches faites</span>
                  <span className="text-xl font-black text-green-700">{kpiData.tasksDone} <span className="text-sm font-medium text-green-600/60">/ 3</span></span>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <span className="text-xs text-orange-600 font-bold uppercase block mb-1">Tâches restantes</span>
                  <span className="text-xl font-black text-orange-700">{kpiData.tasksRemaining}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col justify-center">
                <div className="w-10 h-10 bg-crousty-purple/10 rounded-full flex items-center justify-center text-crousty-purple mb-4">
                  <Thermometer size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Dernière Temp.</span>
                <span className="text-2xl font-black text-gray-800">{kpiData.lastTemp}</span>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 flex flex-col justify-center">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
                  <Clock size={20} />
                </div>
                <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Dernière Action</span>
                <span className="text-lg font-black text-gray-800 leading-tight">{kpiData.lastAction}</span>
              </div>
            </div>
          </div>
`;

content = content.replace(/{\/\* Progress Ring \*\/}[\s\S]*?<\/div>\n          <\/div>/, newKpiUI);

fs.writeFileSync('src/App.tsx', content);
