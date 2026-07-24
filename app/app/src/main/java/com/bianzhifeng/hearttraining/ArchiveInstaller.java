package com.bianzhifeng.hearttraining;

import android.content.Context;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

final class ArchiveInstaller {
  private ArchiveInstaller() {}

  static File install(Context context) throws IOException {
    File root = new File(context.getFilesDir(), "site-v2");
    File index = new File(root, "index.html");
    if (index.isFile()) return index;
    delete(root);
    if (!root.mkdirs() && !root.isDirectory()) throw new IOException("无法创建离线目录");
    StringBuilder encoded = new StringBuilder(150000);
    for (int i = 0; i < 24; i++) {
      String name = String.format("part-%03d.txt", i);
      try (InputStream in = context.getAssets().open(name)) {
        byte[] buffer = new byte[8192]; int n;
        while ((n = in.read(buffer)) > 0) encoded.append(new String(buffer, 0, n, StandardCharsets.US_ASCII));
      }
    }
    byte[] gzip = Base64.decode(encoded.toString(), Base64.DEFAULT);
    try (InputStream in = new GZIPInputStream(new ByteArrayInputStream(gzip))) { extractWeb(in, root); }
    if (!index.isFile()) throw new IOException("数据包中没有网页入口");
    return index;
  }

  private static void extractWeb(InputStream in, File root) throws IOException {
    byte[] header = new byte[512];
    while (readFully(in, header)) {
      if (isZero(header)) break;
      String name = string(header, 0, 100);
      long size = octal(header, 124, 12);
      boolean wanted = name.startsWith("web/") && !name.endsWith("/");
      File out = wanted ? safeFile(root, name.substring(4)) : null;
      OutputStream sink = null;
      try {
        if (out != null) {
          File parent = out.getParentFile();
          if (parent != null && !parent.mkdirs() && !parent.isDirectory()) throw new IOException("无法创建目录");
          sink = new FileOutputStream(out);
        }
        copy(in, sink, size);
      } finally { if (sink != null) sink.close(); }
      long padding = (512 - size % 512) % 512;
      skipFully(in, padding);
    }
  }

  private static File safeFile(File root, String path) throws IOException {
    File file = new File(root, path);
    String base = root.getCanonicalPath() + File.separator;
    if (!file.getCanonicalPath().startsWith(base)) throw new IOException("非法文件路径");
    return file;
  }

  private static void copy(InputStream in, OutputStream out, long length) throws IOException {
    byte[] buffer = new byte[8192]; long left = length;
    while (left > 0) {
      int n = in.read(buffer, 0, (int)Math.min(buffer.length, left));
      if (n < 0) throw new EOFException();
      if (out != null) out.write(buffer, 0, n);
      left -= n;
    }
  }

  private static boolean readFully(InputStream in, byte[] data) throws IOException {
    int p = 0;
    while (p < data.length) { int n = in.read(data, p, data.length - p); if (n < 0) return p != 0 ? fail() : false; p += n; }
    return true;
  }
  private static boolean fail() throws EOFException { throw new EOFException(); }
  private static void skipFully(InputStream in, long n) throws IOException { while (n > 0) { long s = in.skip(n); if (s <= 0) { if (in.read() < 0) throw new EOFException(); s = 1; } n -= s; } }
  private static boolean isZero(byte[] b) { for (byte v : b) if (v != 0) return false; return true; }
  private static String string(byte[] b, int p, int n) { int e=p; while(e<p+n && b[e]!=0)e++; return new String(b,p,e-p,StandardCharsets.UTF_8); }
  private static long octal(byte[] b, int p, int n) { String s=string(b,p,n).trim(); return s.isEmpty()?0:Long.parseLong(s,8); }
  private static void delete(File f) { if (f.isDirectory()) { File[] a=f.listFiles(); if(a!=null) for(File x:a) delete(x); } f.delete(); }
}
