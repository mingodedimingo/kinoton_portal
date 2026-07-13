-- 0015_banner_link_target.sql
-- 배너 링크 타겟 컬럼 추가 (내부 이동: _self, 새 탭: _blank)
ALTER TABLE `banners`
  ADD COLUMN `linkTarget` VARCHAR(10) NOT NULL DEFAULT '_blank'
  AFTER `linkUrl`;
