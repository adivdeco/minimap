"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChevronLeft, ChevronRight } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { getLibraryAttendanceChart } from "../../api/library"

const chartConfig = {
  sessions: {
    label: "Visitors",
    color: "hsl(var(--chart-1))",
  },
}

export function OwnerAttendanceChart({ libraryId }) {
  const [chartData, setChartData] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  
  // Initialize to current month and year
  const currentDate = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(currentDate.getMonth() + 1)
  const [currentYear, setCurrentYear] = React.useState(currentDate.getFullYear())

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await getLibraryAttendanceChart(libraryId, currentMonth, currentYear)
        if (response.success && response.chartData) {
          const processedData = response.chartData.map((item) => {
            // Because item.date is YYYY-MM-DD we should parse it carefully to avoid timezone shifts
            const [yearStr, monthStr, dayStr] = item.date.split("-")
            const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr))
            
            return {
              date: item.date,
              formattedDate: dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              fullDate: dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              sessions: item.totalSessions,
              duration: Number((item.totalDurationMinutes / 60).toFixed(1)), // if needed
              timestamp: dateObj.getTime(),
            }
          })
          setChartData(processedData)
        }
      } catch (error) {
        console.error("Failed to fetch attendance for chart", error)
      } finally {
        setLoading(false)
      }
    }

    if (libraryId) {
      fetchData()
    }
  }, [libraryId, currentMonth, currentYear])

  const totalSessions = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.sessions, 0)
  }, [chartData])

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((prev) => prev - 1)
    } else {
      setCurrentMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((prev) => prev + 1)
    } else {
      setCurrentMonth((prev) => prev + 1)
    }
  }

  // Determine month name for display
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  })

  // Determine if next month should be disabled (prevent going into future months if desired, 
  // currently we allow it or we check against current actual date)
  const isFutureMonth = currentYear > currentDate.getFullYear() || (currentYear === currentDate.getFullYear() && currentMonth > currentDate.getMonth())

  if (!libraryId) {
    return null;
  }

  return (
    <Card className="py-0 border-slate-200 dark:border-white/[0.05] rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden group transition-all">
      <CardHeader className="flex flex-col items-stretch border-b border-slate-100 dark:border-white/5 p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0">
          <div className="flex justify-between items-center w-full">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Daily Visitors</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Number of people visiting per day
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-full p-1 mt-2 sm:mt-0">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-sm font-medium w-28 text-center text-slate-700 dark:text-slate-200">
                {monthName}
              </span>
              <button 
                onClick={handleNextMonth}
                disabled={isFutureMonth}
                className={`p-1.5 rounded-full transition-colors ${isFutureMonth ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-slate-700'}`}
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex">
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-slate-100 dark:border-white/5 px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
              Total Visitors
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl text-indigo-500 dark:text-indigo-400">
              {loading ? "..." : totalSessions}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6 bg-slate-50/50 dark:bg-black/20">
        {loading ? (
             <div className="h-[250px] w-full flex items-center justify-center">
                 <div className="animate-spin w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent"></div>
             </div>
        ) : (
             chartData.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
                    <p>No attendance data available yet.</p>
                </div>
            ) : (
                <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
                >
                <BarChart
                    accessibilityLayer
                    data={chartData}
                    margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12,
                    }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="10 4" opacity={1} />
                    <XAxis
                    dataKey="formattedDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    stroke="currentColor"
                    className="text-xs text-slate-500 dark:text-slate-400"
                    />
                    <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}`}
                    stroke="currentColor"
                    className="text-xs text-slate-500 dark:text-slate-400"
                    />
                    <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                    content={
                        <ChartTooltipContent
                        className="w-[150px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-lg !text-slate-900 dark:!text-white"
                        nameKey="sessions"
                        labelKey="fullDate"
                        />
                    }
                    />
                    <defs>
                    <linearGradient id="glassGlossOwner" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="25%" stopColor="#6366f1" stopOpacity={0.5}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>

                    {/* Advanced Glass Texture Filter */}
                    <filter id="glassTextureOwner" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
                        
                        {/* Create the glass base */}
                        <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture" />
                        <feBlend mode="overlay" in="texture" in2="SourceGraphic" result="glassBase" />
                    </filter>
                    </defs>
                    <Bar 
                    dataKey="sessions" 
                    fill="url(#glassGlossOwner)"
                    stroke="white"
                    strokeWidth={1}
                    strokeOpacity={0.4}
                    filter="url(#glassTextureOwner)"
                    radius={[8, 8, 0, 0]}
                    className="drop-shadow-[0_8px_16px_rgba(99,102,241,0.25)] hover:drop-shadow-[0_12px_24px_rgba(99,102,241,0.4)] transition-all duration-300"
                    />
                </BarChart>
                </ChartContainer>
            )
        )}
      </CardContent>
    </Card>
  )
}
