var path = require('path');


function trim(str) {
  return str.replace(/^\s*/g, '').replace(/\s*$/g, '');
}

function parsePath(str) {
  //去除可能存在的引号
  return str.replace(/[\'|\"]?$/g, '');
}
// 获取相对路径
function getRelativePath(from, to) {
  to = trim(to);
  //console.log(path.relative(from, to).replace(/\\/g, '/'));
  var res = path.relative(from, to).replace(/\\/g, '/');
  if (res.indexOf('.') !== 0) {
    res = './' + res;
  }
  // console.info('from:%s,to:%s,res:%s',from,to,res)
  return res;
}

function parseContent(content, dir) {
  //console.log(file);
  var regs = [{
      patten: /url\([\'|\"]?\s*(\/.*?)[\'|\"]?\s*\)/g,
      handle: function (origin, path) {
        return origin.replace(/\(.*\)/g, '(' + path + ')');
      }
    },
    {
      // 没有小括号的import，必须要有引号和分号
      patten: /@import\s+[\'|\"]\s*(\/.*?)\s*[\'|\"]\s*(?=;)/g,
      handle: function (origin, path) {
        return origin.replace(/[\'|\"]\s*(\/.*)\s*[\'|\"]/g, '"' + path + '"');
      }
    }
  ];

  //var reg = /url\([\'|\"]?\s*(\/.*)[\'|\"]?\s*\)/g;
  for (var i = 0, l = regs.length; i < l; i++) {
    var reg = regs[i];
    content = content.replace(reg.patten, function (m, $1) {
      //console.log(m, $1);
      // if (/(?:https?:)?\/\//.test($1)) {
      if ($1.indexOf('//') === 0) {
        // 如果图片地址是线上地址，不做处理
        console.info('%s not need handle!!!', $1);
        return m;
      }
      var relativePath = getRelativePath(dir, parsePath($1));
      // 可能有括号也可能没括号
      return reg.handle(m, relativePath);
    });
  }
  return content;

}

module.exports = function (ret, conf, settings, opt) {
  // console.log('post-package-relative-url ')
  fis.util.map(ret.src, function (subpath, file) {
    if (file.isCssLike) {
      var content = file.getContent();
      var urlPre = path.dirname(file.url);
      file.setContent(parseContent(content, urlPre));
    }
  });

  fis.util.map(ret.pkg, function (subpath, file) {
    if (file.isCssLike) {
      var content = file.getContent();
      var urlPre = path.dirname(file.url);
      file.setContent(parseContent(content, urlPre));
    }
  });

  // 生成map.json
  var root = fis.project.getProjectPath();
  var ns = fis.get('namespace');
  var mapFile = ns ? (ns + '-map.json') : 'map.json';
  var map = fis.file.wrap(path.join(root, mapFile));
  map.setContent(JSON.stringify(ret.map, null, map.optimizer ? null : 4));
  ret.pkg[map.subpath] = map;

};