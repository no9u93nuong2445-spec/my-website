package com.bianzhifeng.hearttraining;

import android.content.Context;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

final class ArchiveInstaller {
  private ArchiveInstaller() {}

  static File install(Context context) throws IOException {
    File root = new File(context.getFilesDir(), "site-v2-0-1");
    File index = new File(root, "index.html");
    if (index.isFile() && index.length() > 100000) return index;

    delete(root);
    if (!root.mkdirs() && !root.isDirectory()) {
      throw new IOException("无法创建离线目录");
    }

    ByteArrayOutputStream gzipBytes = new ByteArrayOutputStream(100000);
    for (int i = 1; i <= 12; i++) {
      String name = String.format("part-%02d.txt", i);
      String encoded = readAscii(context.getAssets().open(name));
      byte[] decoded;
      try {
        decoded = Base64.decode(encoded, Base64.DEFAULT);
      } catch (IllegalArgumentException error) {
        throw new IOException("离线程序分块损坏：" + name, error);
      }
      gzipBytes.write(decoded);
    }

    if (gzipBytes.size() < 90000) {
      throw new IOException("离线程序文件不完整");
    }

    try (
        InputStream in = new GZIPInputStream(new ByteArrayInputStream(gzipBytes.toByteArray()));
        OutputStream out = new FileOutputStream(index)
    ) {
      copy(in, out);
    }

    if (!index.isFile() || index.length() < 100000) {
      throw new IOException("离线网页解压失败");
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
      return out.toString(StandardCharsets.US_ASCII.name()).replaceAll("\\s", "");
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
    if (file.isDirectory()) {
      File[] children = file.listFiles();
      if (children != null) {
        for (File child : children) delete(child);
      }
    }
    file.delete();
  }
}
