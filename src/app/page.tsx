"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <Badge variant="secondary" className="mb-4">
          Logic Master MVP
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          提升你的表达逻辑
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
          录制你的演讲，获得 AI 驱动的 PREP 结构分析反馈
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full"
      >
        {/* 工作汇报卡片 */}
        <Link href="/practice?topic=workplace" className="block">
          <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>工作汇报</CardTitle>
              <CardDescription>
                练习项目进度、工作成果的结构化汇报
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group">
                开始练习
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        {/* 面试回答卡片 */}
        <Link href="/practice?topic=interview" className="block">
          <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>面试回答</CardTitle>
              <CardDescription>
                练习行为面试、自我介绍等场景的表达
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="group">
                开始练习
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </main>
  );
}
