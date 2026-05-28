import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export async function GET() {
  const filePath = join(process.cwd(), 'public', 'excellentia.apk')
  const file = await readFile(filePath)

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="excellentia.apk"',
      'Content-Length': file.length.toString(),
    },
  })
}
