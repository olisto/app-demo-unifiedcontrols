if [ -n "$(git status --untracked-files=no --porcelain)" ]; then
  echo "Working copy not clean. Not running as changes would be lost. Use git stash maybe?"
  exit;
fi
CUR_REV=`git rev-parse HEAD`
git branch -D gh-pages
git checkout --orphan gh-pages
npm install
RUN_ENV=gh-pages npm run build
git reset --hard
mv dist docs
git add docs
git commit -m "gh-pages build ${CUR_REV}"
git push --force
