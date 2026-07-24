package com.bianzhifeng.hearttraining;

import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;

public class MainActivity extends Activity {
  private static final int PICK_JSON=1001;
  private WebView web;
  private ValueCallback<Uri[]> chooser;
  private long lastBack;

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    web=new WebView(this); setContentView(web);
    WebSettings s=web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
    s.setAllowFileAccess(true); s.setAllowContentAccess(true); s.setSupportZoom(false);
    s.setAllowFileAccessFromFileURLs(true); s.setAllowUniversalAccessFromFileURLs(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.addJavascriptInterface(new Bridge(this),"AndroidBridge");
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
        Uri u=r.getUrl(); String scheme=u.getScheme();
        if("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme)){startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}
        return false;
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){
        if(chooser!=null)chooser.onReceiveValue(null); chooser=cb;
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
        try{startActivityForResult(i,PICK_JSON);return true;}catch(Exception e){chooser=null;return false;}
      }
    });
    web.setDownloadListener((url,ua,cd,mime,len)->{
      if(!url.startsWith("blob:"))return;
      String name=URLUtil.guessFileName(url,cd,mime); if(!name.endsWith(".json"))name="心动训练营_完整备份.json";
      String js="(async()=>{const r=await fetch("+q(url)+");const b=await r.blob();const f=new FileReader();f.onloadend=()=>AndroidBridge.save("+q(name)+",f.result);f.readAsDataURL(b)})()";
      web.evaluateJavascript(js,null);
    });
    try{File index=ArchiveInstaller.install(this);web.loadUrl(Uri.fromFile(index).toString());}
    catch(Exception e){Toast.makeText(this,"离线内容安装失败："+e.getMessage(),Toast.LENGTH_LONG).show();}
  }

  private static String q(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
  @Override protected void onActivityResult(int r,int c,Intent data){super.onActivityResult(r,c,data);if(r!=PICK_JSON||chooser==null)return;Uri[] out=c==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null;chooser.onReceiveValue(out);chooser=null;}
  @Override public void onBackPressed(){long now=System.currentTimeMillis();if(now-lastBack<1800){super.onBackPressed();return;}lastBack=now;Toast.makeText(this,"再按一次退出心动训练营",Toast.LENGTH_SHORT).show();}
  @Override protected void onDestroy(){if(web!=null){web.loadUrl("about:blank");web.destroy();}super.onDestroy();}

  public static final class Bridge {
    private final Context c;
    Bridge(Context x){c=x.getApplicationContext();}
    @JavascriptInterface public void save(String filename,String data){
      try{
        int comma=data.indexOf(',');byte[] bytes=Base64.decode(comma>=0?data.substring(comma+1):data,Base64.DEFAULT);
        String safe=filename.replaceAll("[\\\\/:*?\"<>|]","_");String where;
        if(Build.VERSION.SDK_INT>=29){
          ContentValues v=new ContentValues();v.put(MediaStore.MediaColumns.DISPLAY_NAME,safe);v.put(MediaStore.MediaColumns.MIME_TYPE,"application/json");v.put(MediaStore.MediaColumns.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/HeartTrainingCamp");
          Uri u=c.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(u==null)throw new IOException("无法创建文件");
          try(OutputStream o=c.getContentResolver().openOutputStream(u)){if(o==null)throw new IOException("无法写入文件");o.write(bytes);}where="下载/HeartTrainingCamp/"+safe;
        }else{
          File d=c.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);if(d==null)d=c.getFilesDir();if(!d.mkdirs()&&!d.isDirectory())throw new IOException("无法创建目录");File f=new File(d,safe);try(OutputStream o=new FileOutputStream(f)){o.write(bytes);}where=f.getAbsolutePath();
        }
        show("备份已保存："+where);
      }catch(Exception e){show("备份保存失败："+e.getMessage());}
    }
    private void show(String t){new Handler(c.getMainLooper()).post(()->Toast.makeText(c,t,Toast.LENGTH_LONG).show());}
  }
}
