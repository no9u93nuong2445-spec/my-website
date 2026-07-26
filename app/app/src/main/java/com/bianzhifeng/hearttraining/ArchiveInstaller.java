package com.bianzhifeng.hearttraining;

import android.content.Context;
import android.util.Base64;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

final class ArchiveInstaller {
  private ArchiveInstaller() {}

  static File install(Context context) throws IOException {
    File root = new File(context.getFilesDir(), "site-v2-0-2");
    File index = new File(root, "index.html");
    if (index.isFile() && index.length() > 300000) return index;

    delete(root);
    if (!root.mkdirs() && !root.isDirectory()) {
      throw new IOException("无法创建离线目录");
    }

    // 这些文件是同一条 Base64 字符串的连续切片。
    // 必须先完整拼接，再统一解码；不能逐段 Base64.decode。
    StringBuilder encoded = new StringBuilder(130000);
    for (int i = 1; i <= 12; i++) {
      String name = String.format("part-%02d.txt", i);
      String part = readAscii(context.getAssets().open(name)).replaceAll("\\s", "");
      if (part.isEmpty() || !part.matches("[A-Za-z0-9+/=]+")) {
        throw new IOException("离线程序分块损坏：" + name);
      }
      encoded.append(part);
    }

    if (encoded.length() < 120000 || encoded.length() % 4 != 0) {
      throw new IOException("离线程序编码长度异常：" + encoded.length());
    }

    byte[] gzipBytes;
    try {
      gzipBytes = Base64.decode(encoded.toString(), Base64.DEFAULT);
    } catch (IllegalArgumentException error) {
      throw new IOException("离线程序编码校验失败", error);
    }

    if (gzipBytes.length < 90000
        || (gzipBytes[0] & 0xff) != 0x1f
        || (gzipBytes[1] & 0xff) != 0x8b) {
      throw new IOException("离线程序压缩包不完整：" + gzipBytes.length + "字节");
    }

    try (
        InputStream in = new GZIPInputStream(new ByteArrayInputStream(gzipBytes));
        OutputStream out = new FileOutputStream(index)
    ) {
      copy(in, out);
    } catch (IOException error) {
      delete(index);
      throw new IOException("离线网页解压失败", error);
    }

    if (!index.isFile() || index.length() < 300000) {
      delete(index);
      throw new IOException("离线网页内容不完整");
    }
    return index;
  }

  private static String readAscii(InputStream input) throws IOException {
    try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream(12000)) {
      byte[] buffer = new byte[4096];
      int count;
      while ((count = in.read(buffer)) >= 0) {
        if (count > 0) out.write(buffer, 0, count);
      }
      return out.toString(StandardCharsets.US_ASCII.name());
    }
  }

  private static void copy(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[8192];
    int count;
    while ((count = in.read(buffer)) >= 0) {
      if (count > 0) out.write(buffer, 0, count);
    }
  }

  private static void delete(File file) {
    if (file == null || !file.exists()) return;
    if (file.isDirectory()) {
      File[] children = file.listFiles();
      if (children != null) {
        for (File child : children) delete(child);
      }
    }
    file.delete();
  }
}
