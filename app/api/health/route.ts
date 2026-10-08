import { NextResponse } from "next/server"
import { handle } from "@/lib/api"
import { TODAY_ISO } from "@/lib/config"
import { getDb } from "@/lib/db"
import { describeDb, resolveDbConfig } from "@/lib/db/client"
import { prototypeToolsEnabled } from "@/lib/services/prototype"
import { countRecords } from "@/lib/services/students"

export const dynamic = "force-dynamic"

export async function GET() {
  return handle(async () => {
    const counts = await countRecords(await getDb())
    return NextResponse.json({
      ok: true,
      ...counts,
      referenceDate: TODAY_ISO,
      database: describeDb(resolveDbConfig()),
      prototypeTools: prototypeToolsEnabled(),
    })
  })
}
