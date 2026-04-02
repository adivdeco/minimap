"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { getAttendanceHistory } from "../../api/entry"

export const description = "An interactive bar chart for attendance"

const chartConfig = {
  duration: {
    label: "Hours",
    color: "hsl(var(--chart-1))",
  },
}

export function AttendanceChart() {
  const [chartData, setChartData] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAttendanceHistory()
        if (response.success && response.history) {
          // Process history into chart format and sort by date
          const processedData = response.history
            .map((item) => {
              const dateObj = new Date(item.date)              
              return {
                date: item.date, // original date string
                formattedDate: dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                fullDate: dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
                duration: Number((item.totalDurationToday / 60).toFixed(1)), // convert minutes to hours
                timestamp: dateObj.getTime(),
              }
            })
            .sort((a, b) => a.timestamp - b.timestamp)

          setChartData(processedData)
        }
      } catch (error) {
        console.error("Failed to fetch attendance for chart", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalHours = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.duration, 0).toFixed(1)
  }, [chartData])

  if (loading) {
    return (
      <Card className="py-0 animate-pulse bg-muted/20">
        <div className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading chart data...</p>
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="py-0">
        <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
          <p>No attendance data available yet.</p>
          <p className="text-sm">Start visiting the library to see your trends!</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="py-0 border-slate-200 dark:border-white/[0.05] rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden group transition-all">
      <CardHeader className="flex flex-col items-stretch border-b border-slate-100 dark:border-white/5 p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Attendance Overview</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Daily hours spent in the library
          </CardDescription>
        </div>
        <div className="flex">
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-slate-100 dark:border-white/5 px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
              Total Hours
            </span>
            <span className="text-lg leading-none font-bold sm:text-3xl text-indigo-500 dark:text-indigo-400">
              {totalHours}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6 bg-slate-50/50 dark:bg-black/20">
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
              tickFormatter={(value) => `${value}h`}
              stroke="currentColor"
              className="text-xs text-slate-500 dark:text-slate-400"
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
              content={
                <ChartTooltipContent
                  className="w-[150px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-lg !text-slate-900 dark:!text-white"
                  nameKey="duration"
                  labelKey="fullDate"
                />
              }
            />
            <defs>
              <linearGradient id="glassGloss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="25%" stopColor="#10b981" stopOpacity={0.5}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>

              {/* Advanced Glass Texture Filter */}
              <filter id="glassTexture" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise" />
                
                {/* Create the glass base */}
                <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture" />
                <feBlend mode="overlay" in="texture" in2="SourceGraphic" result="glassBase" />
              </filter>
            </defs>
            <Bar 
              dataKey="duration" 
              fill="url(#glassGloss)"
              stroke="white"
              strokeWidth={1}
              strokeOpacity={0.4}
              filter="url(#glassTexture)"
              radius={[8, 8, 0, 0]}
              className="drop-shadow-[0_8px_16px_rgba(16,185,129,0.25)] hover:drop-shadow-[0_12px_24px_rgba(16,185,129,0.4)] transition-all duration-300"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
