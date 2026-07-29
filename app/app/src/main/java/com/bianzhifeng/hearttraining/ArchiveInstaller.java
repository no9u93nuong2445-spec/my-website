package com.bianzhifeng.hearttraining;

import android.content.Context;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

final class ArchiveInstaller {
  private static final String SITE_DIR = "site-v2-1-9";
  private static final String ASSET_INDEX = "index.html";

  private ArchiveInstaller() {}

  static File install(Context context) throws IOException {
    File root = new File(context.getFilesDir(), SITE_DIR);
    File index = new File(root, ASSET_INDEX);
    if (isValidHtml(index)) return index;

    delete(root);
    if (!root.mkdirs() && !root.isDirectory()) {
      throw new IOException("无法创建离线目录");
    }

    try (
        InputStream in = context.getAssets().open(ASSET_INDEX);
        FileOutputStream out = new FileOutputStream(index)
    ) {
      byte[] buffer = new byte[8192];
      int count;
      while ((count = in.read(buffer)) >= 0) {
        if (count > 0) out.write(buffer, 0, count);
      }
    } catch (IOException error) {
      delete(index);
      throw new IOException("离线网页写入失败", error);
    }

    if (!isValidHtml(index)) {
      delete(index);
      throw new IOException("V2.19离线网页内容不完整");
    }
    return index;
  }

  private static boolean isValidHtml(byte[] html) {
    if (html == null || html.length < 215000) return false;
    String text = new String(html, StandardCharsets.UTF_8);
    String lower = text.toLowerCase();
    return lower.contains("<!doctype html")
        && lower.contains("<html")
        && text.contains("心动训练营")
        && text.contains("V2.19 真人感训练版")
        && text.contains("APP_VERSION = \"2.19\"")
        && text.contains("ROLE_PERSONALITIES_V219")
        && text.contains("HIDDEN_GOALS_V219")
        && text.contains("沉浸模式")
        && text.contains("自由练习")
        && text.contains("课程")
        && text.contains("报告")
        && text.contains("设置")
        && !text.contains("app.js?v=219")
        && !text.contains("style.css?v=219")
        && lower.contains("</html>");
  }

  private static boolean isValidHtml(File file) {
    if (file == null || !file.isFile() || file.length() < 215000) return false;
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
