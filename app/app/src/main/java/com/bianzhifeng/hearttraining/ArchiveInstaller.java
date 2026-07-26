package com.bianzhifeng.hearttraining;

import android.content.Context;
import android.util.Base64;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPInputStream;

final class ArchiveInstaller {
  private static final int PART_COUNT = 12;

  private ArchiveInstaller() {}

  static File install(Context context) throws IOException {
    File root = new File(context.getFilesDir(), "site-v2-0-4");
    File index = new File(root, "index.html");
    if (isValidHtml(index)) return index;

    delete(root);
    if (!root.mkdirs() && !root.isDirectory()) {
      throw new IOException("无法创建离线目录");
    }

    List<String> parts = new ArrayList<>(PART_COUNT);
    for (int i = 1; i <= PART_COUNT; i++) {
      String name = String.format("part-%02d.txt", i);
      String part = readAscii(context.getAssets().open(name)).replaceAll("\\s", "");
      if (part.isEmpty() || !part.matches("[A-Za-z0-9+/=]+")) {
        throw new IOException("离线程序文件损坏：" + name);
      }
      parts.add(part);
    }

    byte[] html = decodeWhole(parts);
    if (html == null) html = decodeSeparately(parts);
    if (html == null || !isValidHtml(html)) {
      throw new IOException("离线程序数据校验失败");
    }

    try (FileOutputStream out = new FileOutputStream(index)) {
      out.write(html);
    } catch (IOException error) {
      delete(index);
      throw new IOException("离线网页写入失败", error);
    }

    if (!isValidHtml(index)) {
      delete(index);
      throw new IOException("离线网页内容不完整");
    }
    return index;
  }

  private static byte[] decodeWhole(List<String> parts) {
    StringBuilder encoded = new StringBuilder(140000);
    for (String part : parts) encoded.append(part);
    try {
      return gunzip(Base64.decode(encoded.toString(), Base64.DEFAULT));
    } catch (Exception ignored) {
      return null;
    }
  }

  private static byte[] decodeSeparately(List<String> parts) {
    try {
      ByteArrayOutputStream gzip = new ByteArrayOutputStream(100000);
      for (String part : parts) gzip.write(Base64.decode(part, Base64.DEFAULT));
      return gunzip(gzip.toByteArray());
    } catch (Exception ignored) {
      return null;
    }
  }

  private static byte[] gunzip(byte[] gzip) throws IOException {
    if (gzip == null || gzip.length < 3
        || (gzip[0] & 0xff) != 0x1f
        || (gzip[1] & 0xff) != 0x8b) {
      return null;
    }
    try (
        InputStream in = new GZIPInputStream(new ByteArrayInputStream(gzip));
        ByteArrayOutputStream out = new ByteArrayOutputStream(340000)
    ) {
      byte[] buffer = new byte[8192];
      int count;
      while ((count = in.read(buffer)) >= 0) {
        if (count > 0) out.write(buffer, 0, count);
      }
      return out.toByteArray();
    }
  }

  private static boolean isValidHtml(byte[] html) {
    if (html == null || html.length < 200000) return false;
    String text = new String(html, StandardCharsets.UTF_8);
    return text.toLowerCase().contains("<!doctype html")
        && text.toLowerCase().contains("<html")
        && text.contains("心动训练营")
        && text.contains("自由练习")
        && text.contains("课程")
        && text.contains("报告")
        && text.contains("设置")
        && text.toLowerCase().contains("</html>");
  }

  private static boolean isValidHtml(File file) {
    if (file == null || !file.isFile() || file.length() < 200000) return false;
    try (InputStream in = new java.io.FileInputStream(file)) {
      ByteArrayOutputStream out = new ByteArrayOutputStream((int) file.length());
      byte[] buffer = new byte[8192];
      int count;
      while ((count = in.read(buffer)) >= 0) {
        if (count > 0) out.write(buffer, 0, count);
      }
      return isValidHtml(out.toByteArray());
    } catch (IOException ignored) {
      return false;
    }
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
