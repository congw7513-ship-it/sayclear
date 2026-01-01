"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, ArrowRight } from "lucide-react";
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
          EQ Coach
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          学会好好说话
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
          录制你的表达，AI 帮你重写成高情商版本
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full"
      >
        {/* 职场沟通卡片 */}
        <Link href="/practice?mode=work" className="block">
          <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>职场沟通</CardTitle>
              <CardDescription>
                练习工作反馈、请求协作、表达不满
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

        {/* 亲密关系卡片 */}
        <Link href="/practice?mode=relationship" className="block">
          <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>亲密关系</CardTitle>
              <CardDescription>
                练习和伴侣、家人、朋友的沟通表达
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
