
/* 首页轮播图 */
const carouselList = [{
		src: "/static/head.jpg",
		background: "rgb(203, 87, 60)",
	},
	{
		src: "/static/moyu.png",
		background: "rgb(203, 87, 60)",
	}
]

const shareList = [{
		type: 1,
		icon: '/static/temp/share_wechat.png',
		text: '微信好友'
	},
	{
		type: 2,
		icon: '/static/temp/share_moment.png',
		text: '朋友圈'
	},
	{
		type: 3,
		icon: '/static/temp/share_qq.png',
		text: 'QQ好友'
	},
	{
		type: 4,
		icon: '/static/temp/share_qqzone.png',
		text: 'QQ空间'
	}
]

export default {
	carouselList,
	shareList,
}
