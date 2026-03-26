"use client"

import * as React from "react"
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { getLibraryShiftAnalytics } from "../../api/library"

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-1))",
  },
}

export function OwnerShiftChart({ libraryId }) {
  const [chartData, setChartData] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [totalVisitors, setTotalVisitors] = React.useState(0)
  
  // Date state initialized to today
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const formattedDateForAPI = selectedDate.toISOString().split('T')[0]
  const displayDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  // Prevent navigating past today
  const isFutureDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const current = new Date(selectedDate)
    current.setHours(0, 0, 0, 0)
    return current >= today
  }

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await getLibraryShiftAnalytics(libraryId, formattedDateForAPI)
        if (response.success) {
          setChartData(response.chartData || [])
          setTotalVisitors(response.totalVisitors || 0)
        }
      } catch (error) {
        console.error("Failed to fetch shift analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (libraryId) {
      fetchData()
    }
  }, [libraryId, formattedDateForAPI])

  const handlePrevDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() - 1)
      return newDate
    })
  }

  const handleNextDay = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + 1)
      return newDate
    })
  }

  if (!libraryId) {
    return null;
  }

  return (
    <Card className="py-0 border-slate-200 dark:border-white/[0.05]  shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden group transition-all w-full h-full flex flex-col">
      <CardHeader className="flex flex-col items-stretch border-b border-slate-100 dark:border-white/5 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
        <div className="flex justify-between items-center w-full">
          <div className="text-left">
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Shifts</CardTitle>
            <CardDescription className="hidden sm:block text-slate-500 dark:text-slate-400">
              Visitor distribution by daily shifts
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-100 dark:bg-slate-800 rounded-full p-1 mt-0">
            <button 
              onClick={handlePrevDay}
              className="p-1 sm:p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-[11px] sm:text-sm font-medium w-16 sm:w-32 text-center text-slate-700 dark:text-slate-200 uppercase sm:capitalize whitespace-nowrap overflow-hidden text-ellipsis">
              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <button 
              onClick={handleNextDay}
              disabled={isFutureDate()}
              className={`p-1 sm:p-1.5 rounded-full transition-colors ${isFutureDate() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-slate-700'}`}
              aria-label="Next Day"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0 px-2 sm:px-6 bg-slate-50/50 dark:bg-black/20 pt-6">
        {loading ? (
             <div className="h-[250px] w-full flex items-center justify-center">
                 <div className="animate-spin w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent"></div>
             </div>
        ) : (
             chartData.length === 0 || totalVisitors === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-center px-4">
                    <p>No shift data for this day.</p>
                </div>
            ) : (
                <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[300px] w-full"
                >
                <RadarChart data={chartData} margin={{ top: -50, right: 30, bottom: 20, left: 30 }}>
                    <ChartTooltip 
                        cursor={false} 
                        content={<ChartTooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-lg !text-slate-900 dark:!text-white" />} 
                    />
                    <PolarAngleAxis 
                        dataKey="shift" 
                        tick={{ fill: "currentColor", fontSize: 11 }}
                        className="text-slate-600 dark:text-slate-400"
                    />
                    <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                    <defs>
                        <linearGradient id="glassGlossRadar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                            <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        </linearGradient>

                        <filter id="glassTextureRadar" x="-20%" y="-20%" width="140%" height="140%">
                            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
                            <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture" />
                            <feBlend mode="overlay" in="texture" in2="SourceGraphic" result="glassBase" />
                        </filter>
                    </defs>
                    <Radar
                        dataKey="visitors"
                        fill="url(#glassGlossRadar)"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        filter="url(#glassTextureRadar)"
                        dot={{
                            r: 5,
                            fill: "#8b5cf6",
                            stroke: "white",
                            strokeWidth: 2,
                            fillOpacity: 1,
                        }}
                        activeDot={{
                            r: 7,
                            strokeWidth: 0
                        }}
                        className="drop-shadow-[0_8px_16px_rgba(139,92,246,0.3)] transition-all duration-300"
                    />
                </RadarChart>
                </ChartContainer>
            )
        )}
      </CardContent>
      <CardFooter className="flex-col sm:flex-row justify-between items-center gap-2 text-sm border-t border-slate-100 dark:border-white/5 py-3 sm:py-4 px-4 sm:px-6 bg-slate-50/80 dark:bg-black/40">
        <div className="flex items-center gap-2 leading-none font-bold text-slate-800 dark:text-slate-200 w-full justify-between sm:w-auto sm:justify-start">
          <span>Total Visitors</span>
          <span className="text-violet-500 dark:text-violet-400 text-lg">{loading ? "..." : totalVisitors}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 leading-none text-slate-500 dark:text-slate-400 text-xs">
          Distribution for {displayDate}
        </div>
      </CardFooter>
    </Card>
  )
}
